import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * A value kept in one of the `store.rs` files and shared between every window.
 *
 * Every notch window (one per screen when mirroring) mounts the same cards, so
 * a sip logged on one screen has to appear on the others. Writes are therefore
 * broadcast as `store-changed` and every other window re-reads — the same idea
 * as `settings-changed`, scoped to one file.
 *
 * `loaded` is the `useSettings` rule again: until the file has been read the
 * value is the caller's guess, and anything that *acts* on it (an alert firing
 * for "no water today") must wait for the real one.
 */
export function useJsonStore<T>(name: 'water' | 'todos' | 'fiverr', initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(!inTauri)
  const initialRef = useRef(initial)
  const valueRef = useRef(value)
  valueRef.current = value

  const read = useCallback(() => {
    if (!inTauri) return
    void invoke<T | null>('read_store', { name })
      .then((stored) => setValue(stored ?? initialRef.current))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [name])

  useEffect(() => {
    read()
    if (!inTauri) return
    const pending = listen<string>('store-changed', (event) => {
      if (event.payload === name) read()
    })
    return () => void pending.then((unlisten) => unlisten())
  }, [name, read])

  /** Replace the value, from the latest state, and persist it. */
  const update = useCallback(
    (next: (current: T) => T) => {
      const value = next(valueRef.current)
      valueRef.current = value
      setValue(value)
      if (!inTauri) return
      void invoke('write_store', { name, value })
        .then(() => emit('store-changed', name))
        .catch(() => {})
    },
    [name],
  )

  return { value, loaded, update }
}

/** `YYYY-MM-DD` on this machine's own clock. */
export function dayKey(at: number | Date = Date.now()) {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** A short random id; nothing here needs more than "unique in one list". */
export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
