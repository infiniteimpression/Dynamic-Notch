import { useCallback, useMemo } from 'react'
import { useJsonStore } from './useJsonStore'
import { fiverrCategory, type FiverrEntry } from '../types/fiverr'
import type { FiverrCategory } from '../types/notch'
import type { WinNotification } from '../types/notifications'

interface FiverrFile {
  entries: FiverrEntry[]
  /** Everything at or before this instant has been seen on the card. */
  seenAt: number
}

const EMPTY: FiverrFile = { entries: [], seenAt: 0 }
const KEEP = 40

export interface FiverrFeed {
  entries: FiverrEntry[]
  unseen: number
  today: Record<FiverrCategory, number>
  /** Record an arrival; returns its category. Lead window only writes. */
  record: (n: WinNotification) => FiverrCategory
  markSeen: () => void
  clear: () => void
}

/**
 * A log of the Fiverr notifications that arrived, kept on disk.
 *
 * Windows' notification centre is not a record — the user clears it, and the
 * browser replaces its own entries — so the card keeps its own short log
 * instead of reading the centre, and survives a relaunch.
 */
export function useFiverr(lead: boolean): FiverrFeed {
  const { value, update } = useJsonStore<FiverrFile>('fiverr', EMPTY)

  const record = useCallback(
    (n: WinNotification) => {
      const category = fiverrCategory(n)
      if (lead) {
        update((file) => {
          if (file.entries.some((e) => e.id === n.id)) return file
          const entry: FiverrEntry = { id: n.id, category, message: n.message, at: n.timestamp || Date.now() }
          return { ...file, entries: [entry, ...file.entries].slice(0, KEEP) }
        })
      }
      return category
    },
    [lead, update],
  )

  const markSeen = useCallback(() => update((file) => ({ ...file, seenAt: Date.now() })), [update])
  const clear = useCallback(() => update(() => ({ entries: [], seenAt: Date.now() })), [update])

  const today = useMemo(() => {
    const start = new Date().setHours(0, 0, 0, 0)
    const counts: Record<FiverrCategory, number> = { order: 0, message: 0, review: 0, payment: 0, other: 0 }
    for (const e of value.entries) if (e.at >= start) counts[e.category] += 1
    return counts
  }, [value.entries])

  return {
    entries: value.entries,
    unseen: value.entries.filter((e) => e.at > value.seenAt).length,
    today,
    record,
    markSeen,
    clear,
  }
}
