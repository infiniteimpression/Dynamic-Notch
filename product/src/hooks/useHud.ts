import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
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

export type Foreground = 'desktop' | 'app'

/** What is in front, from `hud.rs`. The desktop until told otherwise. */
export function useForeground(): Foreground {
  const [kind, setKind] = useState<Foreground>('desktop')
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    void invoke<Foreground>('get_foreground').then(setKind).catch(() => {})
    const pending = listen<Foreground>('foreground', (event) => setKind(event.payload))
    return () => void pending.then((unlisten) => unlisten())
  }, [])
  return kind
}

export type MascotMood = 'awake' | 'looking' | 'drowsy' | 'asleep' | 'waving'

/**
 * The mascot's mood, from "is anyone at the keyboard".
 *
 * `hud.rs` reports idle after 10 s without input. The eyes then appear in
 * place of the clock and look around; a minute later they get drowsy, and two
 * minutes after that they fall asleep. Any input brings a wave, then the clock.
 *
 * Only enabled while the desktop is in front — over an app the notch is a line
 * and has nowhere to draw them.
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
        setMood('looking')
        timers.current.push(window.setTimeout(() => setMood('drowsy'), 60_000))
        timers.current.push(window.setTimeout(() => setMood('asleep'), 180_000))
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
