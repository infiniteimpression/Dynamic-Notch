import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { Extras, HudEvent } from '../types/extras'

/**
 * The volume / brightness / Caps Lock / language pop-ups, from `hud.rs`.
 *
 * Filtering by preference happens here rather than in Rust: the watcher is one
 * cheap loop whatever is switched on, and a switch flipped in Settings takes
 * effect on the very next event without telling the native side anything.
 */
export function useHud(extras: Extras, enabled: boolean, onHud: (hud: HudEvent) => void) {
  const prefs = useRef(extras)
  prefs.current = extras
  const callback = useRef(onHud)
  callback.current = onHud

  useEffect(() => {
    if (!enabled) return
    const pending = listen<HudEvent>('hud', (event) => {
      const hud = event.payload
      const p = prefs.current
      const wanted =
        (hud.kind === 'volume' && p.hudVolume) ||
        (hud.kind === 'brightness' && p.hudBrightness) ||
        (hud.kind === 'capsLock' && p.hudCapsLock) ||
        (hud.kind === 'language' && p.hudLanguage)
      if (wanted) callback.current(hud)
    })
    return () => void pending.then((unlisten) => unlisten())
  }, [enabled])
}

export type MascotMood = 'awake' | 'drowsy' | 'asleep' | 'waving'

/**
 * The mascot's mood, from "is anyone at the keyboard".
 *
 * `hud.rs` reports idle after 45 s without input. The eyes then go drowsy, and
 * after another minute asleep; any input brings them back with a wave that
 * lasts a moment and then settles to awake — where the pill shows the clock
 * again, because the mascot is for an empty desk, not for someone working.
 */
export function useMascotMood(enabled: boolean): MascotMood {
  const [mood, setMood] = useState<MascotMood>('awake')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const clear = () => {
      for (const t of timers.current) window.clearTimeout(t)
      timers.current = []
    }
    if (!enabled) {
      clear()
      setMood('awake')
      return
    }
    const pending = listen<boolean>('user-idle', (event) => {
      clear()
      if (event.payload) {
        setMood('drowsy')
        timers.current.push(window.setTimeout(() => setMood('asleep'), 60_000))
      } else {
        setMood((current) => (current === 'awake' ? 'awake' : 'waving'))
        timers.current.push(window.setTimeout(() => setMood('awake'), 2400))
      }
    })
    return () => {
      clear()
      void pending.then((unlisten) => unlisten())
    }
  }, [enabled])

  return mood
}
