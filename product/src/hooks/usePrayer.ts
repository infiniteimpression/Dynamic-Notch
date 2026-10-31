import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { dayKey } from './useJsonStore'
import type { Extras } from '../types/extras'
import type { WeatherPlace } from '../types/weather'

export interface PrayerTime {
  name: string
  time: string
}

export interface PrayerDay {
  date: string
  hijri: string
  times: PrayerTime[]
}

export interface NextPrayer {
  name: string
  time: string
  /** The instant it begins. */
  at: number
  tomorrow: boolean
}

export interface PrayerFeed {
  place: WeatherPlace | null
  day: PrayerDay | null
  loading: boolean
  error: string | null
  next: NextPrayer | null
  /** The prayer whose time it currently is — between its start and the next one. */
  current: string | null
  now: number
  refresh: () => void
}

/** Sunrise is a time, not a prayer: drawn on the card, never announced. */
const NOT_A_PRAYER = 'Sunrise'
const HEADS_UP_MS = 10 * 60_000

function instant(time: string, base = new Date()) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime()
}

/**
 * Today's prayer times for the weather place, and the alerts around them.
 *
 * The location is deliberately the weather place: Crest already asks for one,
 * and asking twice for where you live would be one question too many. With no
 * place set, the card says so and nothing is fetched.
 *
 * Alerts are a heads-up ten minutes before and a banner at the time itself. A
 * per-day set stops either repeating within the session; at launch, only a time
 * in the last two minutes is still announced, so relaunching after Asr does not
 * report Asr.
 */
export function usePrayer(
  place: WeatherPlace | null,
  extras: Extras,
  onAlert: (name: string, time: string, soon: boolean) => void,
): PrayerFeed {
  const [day, setDay] = useState<PrayerDay | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const today = dayKey(now)

  const fetchDay = useCallback(() => {
    if (!place || !('__TAURI_INTERNALS__' in window)) return
    setLoading(true)
    void invoke<PrayerDay>('get_prayer_times', {
      latitude: place.latitude,
      longitude: place.longitude,
      method: extras.prayerMethod,
      school: extras.prayerSchool,
      date: dayKey(),
    })
      .then((d) => {
        setDay(d)
        setError(null)
      })
      .catch((reason) => setError(typeof reason === 'string' ? reason : 'Could not load prayer times'))
      .finally(() => setLoading(false))
  }, [place, extras.prayerMethod, extras.prayerSchool])

  // Refetch on a new day, a new place or a new method.
  useEffect(() => {
    setDay(null)
    fetchDay()
  }, [fetchDay, today])

  // A failed fetch retries every few minutes rather than leaving the card
  // empty until a relaunch — a laptop waking up offline is the usual cause.
  useEffect(() => {
    if (!error) return
    const id = window.setTimeout(fetchDay, 3 * 60_000)
    return () => window.clearTimeout(id)
  }, [error, fetchDay])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  let next: NextPrayer | null = null
  let current: string | null = null
  if (day && day.date === today) {
    const prayers = day.times.filter((t) => t.name !== NOT_A_PRAYER)
    const upcoming = prayers.find((t) => instant(t.time) > now)
    if (upcoming) next = { ...upcoming, at: instant(upcoming.time), tomorrow: false }
    else if (prayers[0]) {
      const tomorrow = new Date(now + 86_400_000)
      next = { ...prayers[0], at: instant(prayers[0].time, tomorrow), tomorrow: true }
    }
    const started = prayers.filter((t) => instant(t.time) <= now)
    current = started.length ? started[started.length - 1].name : null
  }

  const alert = useRef(onAlert)
  alert.current = onAlert
  const fired = useRef(new Set<string>())

  useEffect(() => {
    if (!extras.prayerAlerts || !day || day.date !== today) return
    for (const t of day.times) {
      if (t.name === NOT_A_PRAYER) continue
      const at = instant(t.time)
      const soonKey = `${day.date}:${t.name}:soon`
      const nowKey = `${day.date}:${t.name}:now`
      if (now >= at - HEADS_UP_MS && now < at - 60_000 && !fired.current.has(soonKey)) {
        fired.current.add(soonKey)
        alert.current(t.name, t.time, true)
      }
      if (now >= at && now < at + 2 * 60_000 && !fired.current.has(nowKey)) {
        fired.current.add(nowKey)
        fired.current.add(soonKey)
        alert.current(t.name, t.time, false)
      }
    }
  }, [now, day, today, extras.prayerAlerts])

  return { place, day, loading, error, next, current, now, refresh: fetchDay }
}

/** "1h 05m", "12m", "now". */
export function untilText(ms: number) {
  if (ms <= 30_000) return 'now'
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
}

/** "17:42" → "5:42 PM", or kept 24h if this machine uses 24h. */
export function clockText(time: string) {
  const at = new Date(instant(time))
  return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
