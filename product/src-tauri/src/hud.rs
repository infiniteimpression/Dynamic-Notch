//! The machine's small state changes — volume, brightness, Caps Lock, keyboard
//! language — plus "is a full-screen app in front" and "is anyone at the
//! keyboard". One thread, one loop, all of it polled.
//!
//! **Polled, never hooked.** Nusa listens to the keyboard with a low-level hook,
//! which is exactly what antivirus heuristics flag. Every reading here is a
//! state query Windows already answers for any app (`GetKeyState`,
//! `GetKeyboardLayout`, the endpoint's own volume, the power scheme's brightness
//! value), so nothing ever sees a keystroke. The cost is a few microseconds every
//! 100 ms.
//!
//! **Raw FFI for the Win32 calls.** The `windows` crate moves handle types and
//! parameter shapes between versions; these are a dozen stable C signatures, so
//! they are declared here once and cannot break on a dependency bump. Volume is
//! COM and goes through the crate, the same way `audio.rs` does.
//!
//! Each reading takes its first value as a baseline, so launching the app never
//! announces the volume it was already at.

use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize, Clone, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Hud {
    Volume { level: u32, muted: bool },
    Brightness { level: u32 },
    CapsLock { on: bool },
    Language { locale: String },
}

#[cfg(not(windows))]
pub fn start(_app: &AppHandle) {}

#[cfg(windows)]
pub fn start(app: &AppHandle) {
    native::start(app.clone());
}

#[cfg(windows)]
mod native {
    use super::Hud;
    use std::collections::HashSet;
    use std::ffi::c_void;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Emitter};

    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    // ---------------------------------------------------------------- FFI --

    #[repr(C)]
    #[derive(Default, Clone, Copy, PartialEq)]
    struct Rect {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }

    #[repr(C)]
    #[derive(Default)]
    struct MonitorInfo {
        cb_size: u32,
        rc_monitor: Rect,
        rc_work: Rect,
        flags: u32,
    }

    #[repr(C)]
    #[derive(Default)]
    struct LastInputInfo {
        cb_size: u32,
        time: u32,
    }

    #[repr(C)]
    #[derive(Default)]
    struct PowerStatus {
        ac_line_status: u8,
        battery_flag: u8,
        battery_life_percent: u8,
        system_status_flag: u8,
        battery_life_time: u32,
        battery_full_life_time: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct Guid {
        data1: u32,
        data2: u16,
        data3: u16,
        data4: [u8; 8],
    }

    /// GUID_VIDEO_SUBGROUP
    const VIDEO_SUBGROUP: Guid = Guid {
        data1: 0x7516b95f,
        data2: 0xf776,
        data3: 0x4464,
        data4: [0x8c, 0x53, 0x06, 0x16, 0x7f, 0x40, 0xcc, 0x99],
    };
    /// The display brightness value inside it (VIDEO_NORMALLEVEL).
    const VIDEO_BRIGHTNESS: Guid = Guid {
        data1: 0xaded5e82,
        data2: 0xb909,
        data3: 0x4619,
        data4: [0x99, 0x49, 0xf5, 0xd7, 0x1d, 0xac, 0x0b, 0xcb],
    };

    const VK_CAPITAL: i32 = 0x14;
    const MONITOR_DEFAULTTONULL: u32 = 0;

    #[link(name = "user32")]
    extern "system" {
        fn GetKeyState(vk: i32) -> i16;
        fn GetKeyboardLayout(thread: u32) -> isize;
        fn GetForegroundWindow() -> isize;
        fn GetWindowThreadProcessId(hwnd: isize, pid: *mut u32) -> u32;
        fn GetWindowRect(hwnd: isize, rect: *mut Rect) -> i32;
        fn GetClassNameW(hwnd: isize, buf: *mut u16, max: i32) -> i32;
        fn MonitorFromWindow(hwnd: isize, flags: u32) -> isize;
        fn GetMonitorInfoW(monitor: isize, info: *mut MonitorInfo) -> i32;
        fn GetLastInputInfo(info: *mut LastInputInfo) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetTickCount() -> u32;
        fn LCIDToLocaleName(lcid: u32, name: *mut u16, cch: i32, flags: u32) -> i32;
        fn LocalFree(mem: *mut c_void) -> *mut c_void;
        fn GetSystemPowerStatus(status: *mut PowerStatus) -> i32;
    }

    #[link(name = "powrprof")]
    extern "system" {
        fn PowerGetActiveScheme(root: isize, scheme: *mut *mut Guid) -> u32;
        fn PowerReadACValueIndex(
            root: isize,
            scheme: *const Guid,
            subgroup: *const Guid,
            setting: *const Guid,
            value: *mut u32,
        ) -> u32;
        fn PowerReadDCValueIndex(
            root: isize,
            scheme: *const Guid,
            subgroup: *const Guid,
            setting: *const Guid,
            value: *mut u32,
        ) -> u32;
    }

    // ----------------------------------------------------------- readings --

    fn caps_lock() -> bool {
        unsafe { GetKeyState(VK_CAPITAL) & 1 == 1 }
    }

    /// The foreground window and the language of the layout it is typing in.
    ///
    /// Windows keeps a layout *per thread*, so the language is read off whatever
    /// the user is typing into — which is also why a change only counts when the
    /// foreground window did not change in the same poll: alt-tabbing between an
    /// Urdu chat and an English editor is not someone switching language.
    fn language() -> (isize, u16) {
        unsafe {
            let hwnd = GetForegroundWindow();
            let thread = GetWindowThreadProcessId(hwnd, std::ptr::null_mut());
            let layout = GetKeyboardLayout(thread) as usize;
            (hwnd, (layout & 0xFFFF) as u16)
        }
    }

    fn locale_name(langid: u16) -> String {
        let mut buf = [0u16; 85];
        let len = unsafe { LCIDToLocaleName(langid as u32, buf.as_mut_ptr(), buf.len() as i32, 0) };
        if len <= 1 {
            return format!("{langid:04x}");
        }
        String::from_utf16_lossy(&buf[..(len as usize - 1)])
    }

    /// The brightness Windows has stored for the active power plan, which is
    /// what the brightness keys and the quick-settings slider move on a laptop
    /// panel. Desktop monitors with no such value simply never announce.
    fn brightness() -> Option<u32> {
        unsafe {
            let mut scheme: *mut Guid = std::ptr::null_mut();
            if PowerGetActiveScheme(0, &mut scheme) != 0 || scheme.is_null() {
                return None;
            }
            let mut status = PowerStatus::default();
            let on_ac = GetSystemPowerStatus(&mut status) == 0 || status.ac_line_status != 0;
            let mut value = 0u32;
            let result = if on_ac {
                PowerReadACValueIndex(0, scheme, &VIDEO_SUBGROUP, &VIDEO_BRIGHTNESS, &mut value)
            } else {
                PowerReadDCValueIndex(0, scheme, &VIDEO_SUBGROUP, &VIDEO_BRIGHTNESS, &mut value)
            };
            LocalFree(scheme as *mut c_void);
            (result == 0).then_some(value.min(100))
        }
    }

    fn endpoint() -> Option<IAudioEndpointVolume> {
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
            let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole).ok()?;
            device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None).ok()
        }
    }

    fn volume(endpoint: &IAudioEndpointVolume) -> Option<(u32, bool)> {
        unsafe {
            let level = endpoint.GetMasterVolumeLevelScalar().ok()?;
            let muted = endpoint.GetMute().ok()?.as_bool();
            Some(((level * 100.0).round() as u32, muted))
        }
    }

    fn idle_ms() -> u32 {
        unsafe {
            let mut info = LastInputInfo {
                cb_size: std::mem::size_of::<LastInputInfo>() as u32,
                time: 0,
            };
            if GetLastInputInfo(&mut info) == 0 {
                return 0;
            }
            GetTickCount().wrapping_sub(info.time)
        }
    }

    fn class_name(hwnd: isize) -> String {
        let mut buf = [0u16; 128];
        let len = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
        String::from_utf16_lossy(&buf[..len.max(0) as usize])
    }

    /// The monitor rectangle a full-screen app is covering, if one is in front.
    ///
    /// "Full screen" is the foreground window's rect equalling its monitor's
    /// whole rect — taskbar included, which is what separates a game or a video
    /// from a merely maximised window. The desktop and the taskbar are
    /// themselves monitor-sized and are excluded by class, and so is anything
    /// belonging to this process.
    fn fullscreen_monitor() -> Option<Rect> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd == 0 {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == std::process::id() {
                return None;
            }
            let class = class_name(hwnd);
            if matches!(
                class.as_str(),
                "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" | ""
            ) {
                return None;
            }
            let mut rect = Rect::default();
            if GetWindowRect(hwnd, &mut rect) == 0 {
                return None;
            }
            let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONULL);
            if monitor == 0 {
                return None;
            }
            let mut info = MonitorInfo {
                cb_size: std::mem::size_of::<MonitorInfo>() as u32,
                ..Default::default()
            };
            if GetMonitorInfoW(monitor, &mut info) == 0 {
                return None;
            }
            let m = info.rc_monitor;
            let covers = rect.left <= m.left
                && rect.top <= m.top
                && rect.right >= m.right
                && rect.bottom >= m.bottom;
            covers.then_some(m)
        }
    }

    // --------------------------------------------------------------- loop --

    const TICK: Duration = Duration::from_millis(100);
    /// How long without input before the mascot is allowed to appear.
    const IDLE_AFTER_MS: u32 = 45_000;

    pub fn start(app: AppHandle) {
        std::thread::spawn(move || run(app));
    }

    fn run(app: AppHandle) {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let mut caps = caps_lock();
        let (mut fg, mut lang) = language();
        let mut bright = brightness();
        let mut speaker = endpoint();
        let mut vol = speaker.as_ref().and_then(volume);
        let mut idle = false;
        let mut hidden_by_us: HashSet<String> = HashSet::new();

        let mut last_endpoint = Instant::now();
        let mut last_slow = Instant::now();

        loop {
            std::thread::sleep(TICK);

            // Caps Lock — every tick, it is one call.
            let now_caps = caps_lock();
            if now_caps != caps {
                caps = now_caps;
                let _ = app.emit("hud", Hud::CapsLock { on: caps });
            }

            // Keyboard language — only when the window did not change too.
            let (now_fg, now_lang) = language();
            if now_fg == fg && now_lang != lang && now_lang != 0 {
                let _ = app.emit(
                    "hud",
                    Hud::Language {
                        locale: locale_name(now_lang),
                    },
                );
            }
            fg = now_fg;
            lang = now_lang;

            // Volume. The endpoint is re-resolved every few seconds (the default
            // device may have changed), and the first reading after that is a
            // baseline, so switching to headphones at a different level does not
            // read as someone turning the volume up.
            if last_endpoint.elapsed() > Duration::from_secs(4) || speaker.is_none() {
                last_endpoint = Instant::now();
                speaker = endpoint();
                vol = speaker.as_ref().and_then(volume);
            } else if let Some(reading) = speaker.as_ref().and_then(volume) {
                if Some(reading) != vol {
                    vol = Some(reading);
                    let _ = app.emit(
                        "hud",
                        Hud::Volume {
                            level: reading.0,
                            muted: reading.1,
                        },
                    );
                }
            }

            // The slower half: brightness, idle and full screen, every 500 ms.
            if last_slow.elapsed() < Duration::from_millis(500) {
                continue;
            }
            last_slow = Instant::now();

            let now_bright = brightness();
            if now_bright.is_some() && now_bright != bright && bright.is_some() {
                let _ = app.emit(
                    "hud",
                    Hud::Brightness {
                        level: now_bright.unwrap_or(0),
                    },
                );
            }
            if now_bright.is_some() {
                bright = now_bright;
            }

            let now_idle = idle_ms() >= IDLE_AFTER_MS;
            if now_idle != idle {
                idle = now_idle;
                let _ = app.emit("user-idle", idle);
            }

            fullscreen(&app, &mut hidden_by_us);
        }
    }

    /// Step the notch aside for a full-screen app on its own monitor, and bring
    /// back only the windows this loop hid — never one hidden for another reason
    /// (the updater hides the notch while it installs).
    fn fullscreen(app: &AppHandle, hidden_by_us: &mut HashSet<String>) {
        let enabled = crate::settings::current(app).extras.hide_in_fullscreen;
        let covered = if enabled { fullscreen_monitor() } else { None };

        for window in crate::display::notch_windows(app) {
            let label = window.label().to_string();
            let on_covered = match (covered, window.current_monitor()) {
                (Some(rect), Ok(Some(monitor))) => {
                    let pos = monitor.position();
                    pos.x == rect.left && pos.y == rect.top
                }
                _ => false,
            };

            if on_covered {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                    hidden_by_us.insert(label);
                }
            } else if hidden_by_us.remove(&label) {
                let _ = window.show();
            }
        }
    }
}
