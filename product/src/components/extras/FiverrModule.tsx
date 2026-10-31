import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Button, EmptyNote, Icon } from './ui'
import { color, radius } from '../../tokens'
import { FIVERR_GREEN, FIVERR_LABEL, FIVERR_LINKS, type FiverrEntry } from '../../types/fiverr'
import type { FiverrFeed } from '../../hooks/useFiverr'

/**
 * The Fiverr card. Heights pinned to `size.fiverr` (270):
 * 26 nav + 12 + 44 stats + 8 + 3 × 44 rows + 8 + 28 actions + 12.
 */
const ROW = 44

export default function FiverrModule({ feed, enabled }: { feed: FiverrFeed; enabled: boolean }) {
  // Opening the card is reading it.
  const { markSeen, unseen } = feed
  useEffect(() => {
    if (unseen > 0) markSeen()
  }, [markSeen, unseen])

  const open = (url: string) => void openUrl(url).catch(() => {})

  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
      {/* Stats — 44 */}
      <div style={{ height: 44, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Stat label="Orders today" value={feed.today.order} highlight />
        <Stat label="Messages" value={feed.today.message} />
        <Stat label="Reviews & tips" value={feed.today.review + feed.today.payment} />
      </div>

      {/* Log — 3 rows */}
      <div style={{ height: ROW * 3, marginTop: 8, overflowY: 'auto', overflowX: 'hidden' }}>
        {!enabled ? (
          <EmptyNote
            title="Notifications are off"
            body="Turn on “Notifications in the notch” in Settings so Fiverr alerts can reach this card."
          />
        ) : feed.entries.length === 0 ? (
          <EmptyNote
            title="No Fiverr alerts yet"
            body="Allow notifications for fiverr.com in your browser. Orders and messages will show up here as they arrive."
          />
        ) : (
          <AnimatePresence initial={false}>
            {feed.entries.map((entry) => (
              <Row key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Actions — 28 */}
      <div style={{ height: 28, marginTop: 8, display: 'flex', gap: 8 }}>
        <Button primary tint={FIVERR_GREEN} height={28} onClick={() => open(FIVERR_LINKS.inbox)} style={{ flex: 1, color: '#fff' }}>
          <Icon size={14}><path d="M4 6.5h16v11H4zM4 7l8 6 8-6" /></Icon>
          Inbox
        </Button>
        <Button height={28} onClick={() => open(FIVERR_LINKS.dashboard)} style={{ flex: 1 }}>
          Seller dashboard
        </Button>
        <Button height={28} onClick={feed.clear} disabled={feed.entries.length === 0} title="Clear the log">
          <Icon size={14}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Icon>
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="tile"
      style={{
        borderRadius: radius.tile,
        padding: '0 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: highlight && value > 0 ? 'rgba(29,191,115,.16)' : color.tile,
      }}
    >
      <motion.div
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1, color: highlight && value > 0 ? FIVERR_GREEN : color.text.strong }}
      >
        {value}
      </motion.div>
      <div style={{ fontSize: 10, color: color.text.secondary, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

function Row({ entry }: { entry: FiverrEntry }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ height: ROW, display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          borderRadius: radius.small,
          background: 'rgba(29,191,115,.16)',
          color: FIVERR_GREEN,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {entry.category === 'order' ? '$' : entry.category === 'message' ? '✉' : entry.category === 'review' ? '★' : 'f'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, color: color.text.muted }}>
          {FIVERR_LABEL[entry.category]} · {ago(entry.at)}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: color.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.message}
        </span>
      </span>
    </motion.div>
  )
}

function ago(at: number) {
  const mins = Math.round((Date.now() - at) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
