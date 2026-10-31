import { useCallback, useEffect, useMemo, useRef } from 'react'
import { dayKey, useJsonStore } from './useJsonStore'
import type { Extras } from '../types/extras'

interface Sip {
  at: number
  ml: number
}

interface WaterFile {
  /** Sips by day, `YYYY-MM-DD`. Only the last fortnight is kept. */
  days: Record<string, Sip[]>
  /** The last time a reminder was shown, so a relaunch does not re-nag. */
  lastNudgeAt: number | null
}

const EMPTY: WaterFile = { days: {}, lastNudgeAt: null }
const KEEP_DAYS = 14

export interface WaterFeed {
  loaded: boolean
  drankMl: number
  goalMl: number
  sipMl: number
  /** Today's intake in two-hour buckets across the active hours, for the chart. */
  buckets: { label: string; ml: number }[]
  /** The last fortnight's daily totals, oldest first, for the streak line. */
  history: { day: string; ml: number }[]
  drink: (ml?: number) => void
  undo: () => void
  canUndo: boolean
}

/**
 * The water card and its reminders.
 *
 * A reminder is due when the clock is inside the active hours, today's goal is
 * not met, and both the last sip and the last nudge are at least `every`
 * minutes ago — so drinking resets the countdown, which is the whole point of a
 * reminder that knows what you drank. The nudge time is stored, not held in
 * memory, because the app relaunches on every update.
 */
export function useWater(extras: Extras, lead: boolean, onNudge: (drankMl: number, goalMl: number) => void): WaterFeed {
  const { value, loaded, update } = useJsonStore<WaterFile>('water', EMPTY)
  const today = dayKey()
  const sips = value.days[today] ?? []
  const drankMl = sips.reduce((sum, sip) => sum + sip.ml, 0)

  const drink = useCallback(
    (ml?: number) =>
      update((file) => {
        const key = dayKey()
        const days = { ...file.days, [key]: [...(file.days[key] ?? []), { at: Date.now(), ml: ml ?? extras.waterSipMl }] }
        // Forget anything older than the fortnight the chart can show.
        const cutoff = dayKey(Date.now() - KEEP_DAYS * 86_400_000)
        for (const day of Object.keys(days)) if (day < cutoff) delete days[day]
        return { ...file, days }
      }),
    [update, extras.waterSipMl],
  )

  const undo = useCallback(
    () =>
      update((file) => {
        const key = dayKey()
        const list = file.days[key] ?? []
        return { ...file, days: { ...file.days, [key]: list.slice(0, -1) } }
      }),
    [update],
  )

  const buckets = useMemo(() => {
    const start = Math.min(extras.waterStartHour, 22)
    const end = Math.max(extras.waterEndHour, start + 2)
    const out: { label: string; ml: number }[] = []
    for (let h = start; h < end; h += 2) {
      const ml = sips
        .filter((s) => {
          const hour = new Date(s.at).getHours()
          return hour >= h && hour < h + 2
        })
        .reduce((sum, s) => sum + s.ml, 0)
      out.push({ label: String(h % 24).padStart(2, '0'), ml })
    }
    return out
  }, [sips, extras.waterStartHour, extras.waterEndHour])

  const history = useMemo(() => {
    const out: { day: string; ml: number }[] = []
    for (let i = KEEP_DAYS - 1; i >= 0; i--) {
      const day = dayKey(Date.now() - i * 86_400_000)
      out.push({ day, ml: (value.days[day] ?? []).reduce((sum, s) => sum + s.ml, 0) })
    }
    return out
  }, [value.days])

  // The reminder tick. Lead window only: it is the one that records the nudge,
  // and the banner it raises is drawn by whichever window announces it.
  const nudge = useRef(onNudge)
  nudge.current = onNudge
  const state = useRef({ value, drankMl })
  state.current = { value, drankMl }

  useEffect(() => {
    if (!loaded || !lead || !extras.waterReminders) return
    const tick = () => {
      const now = new Date()
      const hour = now.getHours()
      if (hour < extras.waterStartHour || hour >= extras.waterEndHour) return
      const { value: file, drankMl: drank } = state.current
      if (drank >= extras.waterGoalMl) return
      const every = extras.waterEveryMin * 60_000
      const todaySips = file.days[dayKey()] ?? []
      const lastSip = todaySips.length ? todaySips[todaySips.length - 1].at : 0
      // The day's first window opening counts as a "last event", so the first
      // nudge comes `every` minutes after the active hours begin, not at once.
      const opened = new Date(now).setHours(extras.waterStartHour, 0, 0, 0)
      const last = Math.max(lastSip, file.lastNudgeAt ?? 0, opened)
      if (now.getTime() - last < every) return
      update((f) => ({ ...f, lastNudgeAt: Date.now() }))
      nudge.current(drank, extras.waterGoalMl)
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [loaded, lead, extras.waterReminders, extras.waterStartHour, extras.waterEndHour, extras.waterGoalMl, extras.waterEveryMin, update])

  return {
    loaded,
    drankMl,
    goalMl: extras.waterGoalMl,
    sipMl: extras.waterSipMl,
    buckets,
    history,
    drink,
    undo,
    canUndo: sips.length > 0,
  }
}
