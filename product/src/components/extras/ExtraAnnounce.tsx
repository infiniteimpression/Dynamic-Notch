import { motion, useReducedMotion } from 'framer-motion'
import Banner, { Glyph } from './Banner'
import { clockText } from '../../hooks/usePrayer'
import { color } from '../../tokens'
import { FIVERR_GREEN, FIVERR_LABEL } from '../../types/fiverr'
import type { Announcement } from '../../types/notch'

type Of<K extends Announcement['kind']> = Extract<Announcement, { kind: K }>

export function WaterAnnounce({ a }: { a: Of<'water'> }) {
  const still = useReducedMotion() ?? false
  const left = Math.max(0, a.goalMl - a.drankMl)
  return (
    <Banner
      glyph={
        <Glyph>
          <motion.path
            d="M12 3.5c3 3.6 5.5 6.9 5.5 10a5.5 5.5 0 0 1-11 0c0-3.1 2.5-6.4 5.5-10z"
            initial={still ? false : { y: -4, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          />
          <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
        </Glyph>
      }
      kicker="Water"
      title="Time for a glass of water"
      sub={`${(a.drankMl / 1000).toFixed(2)} L so far · ${(left / 1000).toFixed(2)} L to go · hover to log`}
    />
  )
}

export function TodoAnnounce({ a }: { a: Of<'todo'> }) {
  return (
    <Banner
      glyph={
        <Glyph>
          <motion.g
            animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
            transition={{ duration: 0.8 }}
            style={{ transformOrigin: '12px 4px' }}
          >
            <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
          </motion.g>
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </Glyph>
      }
      kicker="Time's up!"
      title={a.task.title}
      sub="hover to tick it off or snooze"
    />
  )
}

export function PrayerAnnounce({ a }: { a: Of<'prayer'> }) {
  return (
    <Banner
      glyph={
        <Glyph>
          <path d="M15.5 4.5a7.5 7.5 0 1 0 4 10.5 6 6 0 0 1-4-10.5z" />
        </Glyph>
      }
      kicker={a.soon ? 'Coming up' : 'Prayer time'}
      title={a.soon ? `${a.name} in 10 minutes` : `It's time for ${a.name}`}
      sub={`${a.name} · ${clockText(a.time)}`}
    />
  )
}

export function FiverrAnnounce({ a }: { a: Of<'fiverr'> }) {
  return (
    <Banner
      tint={FIVERR_GREEN}
      glyph={
        <span style={{ color: FIVERR_GREEN, fontWeight: 800, fontSize: 18, fontFamily: 'Segoe UI, sans-serif' }}>
          {a.category === 'order' ? '$' : a.category === 'message' ? '✉' : a.category === 'review' ? '★' : 'fi'}
        </span>
      }
      kicker={`Fiverr · ${FIVERR_LABEL[a.category]}`}
      title={<span style={{ color: a.category === 'order' ? FIVERR_GREEN : color.text.strong }}>{headline(a)}</span>}
      sub={a.notification.message}
    />
  )
}

function headline(a: Of<'fiverr'>) {
  switch (a.category) {
    case 'order':
      return 'Order update'
    case 'message':
      return 'You have a new message'
    case 'review':
      return 'New review'
    case 'payment':
      return 'Earnings update'
    default:
      return 'New Fiverr notification'
  }
}
