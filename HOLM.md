# Holm

Holm is a fork of [Crest](https://github.com/LennyDany-03/Dynamic-Notch) by
Lenny Dany, used under the MIT licence, with features modelled on Nusa and a few
of its own. Everything Crest already did is kept.

## What this fork adds

| Feature | Where |
|---|---|
| **Mascot** — the clock gives way to a pair of eyes when the PC is idle; they doze, fall asleep, and wave when you come back | resting pill |
| **Minimal notch** — the resting pill becomes a thin black line for laptops with a thick bezel | Settings → Extras |
| **Hide in full screen** — the notch steps aside for full-screen games, videos and slides on its screen | Settings → Extras |
| **Pop-ups** — volume (with a gliding level bar), brightness, Caps Lock and keyboard language | banners |
| **Water** — one-click logging, a chart of the day, a 7-day streak, reminders that reset when you drink | Water card |
| **To-do** — tasks with colours and a due time, a "Time's up!" banner, snooze | To-do card |
| **Prayer times** — today's five prayers for your Weather city (Karachi method, Hanafi Asr by default), a live countdown, a heads-up 10 minutes before and a chime at the time | Prayer card |
| **Fiverr alerts** — Fiverr's browser or mail notifications get a green banner and a chime, a log, today's order/message counts, and buttons to the inbox and seller dashboard | Fiverr card |

All new behaviour is configured under **Settings → Extras**; the new cards are
switched on and off in **Settings → Panels** like Crest's own.

## Differences from Crest that matter

- **Own identity.** App ID `com.infiniteimpression.holm`, its own data folder,
  startup task and single-instance lock, so Holm and Crest can be installed
  side by side without touching each other's settings.
- **No auto-update.** Crest's updater follows upstream's release feed and would
  replace Holm with stock Crest, so it is switched off and the tray's "Check
  for updates" row is hidden. New versions are installed from this repository's
  Releases page.
- **No keyboard hook.** The pop-ups read state Windows already exposes
  (`GetKeyState`, the active layout, the endpoint volume, the power plan's
  brightness). Nothing ever sees a keystroke.
- **Fiverr has no API for this.** The card reads the notifications Fiverr already
  sends to Windows. Allow notifications for fiverr.com in your browser and keep
  "Notifications in the notch" on.
- **Brightness** is the value Windows stores for the active power plan, which is
  what laptop brightness keys change. Most desktop monitors don't report one.

## Building

Push to `main` (or run **Actions → Build Holm → Run workflow**). GitHub builds
the installer on Windows and attaches it to a new release. No secrets needed.

Locally, from `product/`: `npm ci`, then `npx tauri build --bundles nsis`
(Rust, Node 20 and the Visual Studio C++ build tools required).

## Code map for the additions

- Native: `src-tauri/src/hud.rs` (pop-ups, idle, full screen),
  `prayer.rs` (Aladhan API), `store.rs` (water / to-do / Fiverr files),
  `settings.rs` (`Extras` block, `set_extras`).
- Frontend: `src/hooks/use{Hud,Water,Todos,Prayer,Fiverr,JsonStore}.ts`,
  `src/components/extras/`, `src/types/{extras,todo,fiverr}.ts`.
- Card heights are pinned in `tokens.ts` with their arithmetic, following
  Crest's rule that the drawn card and its hit rect never disagree.
