import type { FiverrCategory } from './notch'
import type { WinNotification } from './notifications'

/**
 * Fiverr has no Windows app and no API for sellers' notifications, so this
 * reads the next best thing: the notifications Fiverr already sends to Windows
 * through the browser (enable them on fiverr.com) or a mail app. A notification
 * counts as Fiverr's if its app or text names Fiverr.
 */
export function isFiverr(n: WinNotification) {
  return /fiverr/i.test(`${n.app} ${n.appId} ${n.message}`)
}

/** What it is about, from its wording. Order before message: "new order message". */
export function fiverrCategory(n: WinNotification): FiverrCategory {
  const text = n.message
  if (/\b(new order|order (?:started|placed|delivered|cancel\w*|completed|is late|revision)|placed an order|requested a revision|requirements|extension|custom offer accepted)\b/i.test(text))
    return 'order'
  if (/\b(review|rated|rating|tip|left you)\b/i.test(text)) return 'review'
  if (/\b(payment|withdraw\w*|earning\w*|cleared|funds|revenue)\b/i.test(text)) return 'payment'
  if (/\b(message|sent you|replied|inbox|wrote|brief)\b/i.test(text)) return 'message'
  return 'other'
}

export const FIVERR_LABEL: Record<FiverrCategory, string> = {
  order: 'New order activity',
  message: 'New message',
  review: 'Review',
  payment: 'Earnings',
  other: 'Fiverr',
}

/** Fiverr's own green, used only on Fiverr surfaces. */
export const FIVERR_GREEN = '#1dbf73'

export interface FiverrEntry {
  id: string
  category: FiverrCategory
  message: string
  at: number
}

export const FIVERR_LINKS = {
  inbox: 'https://www.fiverr.com/inbox',
  dashboard: 'https://www.fiverr.com/seller_dashboard',
}
