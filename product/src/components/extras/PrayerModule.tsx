import { motion } from 'framer-motion'
import { EmptyNote } from './ui'
import { clockText, untilText, type PrayerFeed } from '../../hooks/usePrayer'
import { color, font, radius, sectionLabel } from '../../tokens'

/**
 * The prayer times card. Heights pinned to `size.prayer` (226):
 * 26 nav + 14 + 50 next-up + 10 + (2 × 52 tiles + 8) + 14.
 */
export default function PrayerModule({ feed }: { feed: PrayerFeed }) {
  if (!feed.place) {
    return (
      <EmptyNote
        title="Where are you?"
        body="Prayer times use your weather location. Set your city in Settings → Weather and they'll appear here."
      />
    )
  }
  if (!feed.day) {
    return (
      <EmptyNote
        title={feed.error ? 'Prayer times unavailable' : 'Loading prayer times…'}
        body={feed.error ? `${feed.error}. Retrying in a few minutes.` : feed.place.name}
      />
    )
  }

  const next = feed.next
  const passedUntil = next && !next.tomorrow ? next.name : null
  let passed = true

  return (
    <div style={{ height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Next up — 50 */}
      <div style={{ height: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Crescent />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={sectionLabel}>{next?.tomorrow ? 'Next · tomorrow' : 'Next prayer'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, color: color.text.strong }}>
              {next?.name ?? '—'}
            </span>
            {next && (
              <span style={{ fontSize: 12, color: color.accent, fontWeight: 600 }}>
                in {untilText(next.at - feed.now)}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 0, maxWidth: 150 }}>
          <div style={{ fontSize: 11.5, color: color.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {feed.place.name.split(',')[0]}
          </div>
          <div style={{ fontSize: 10.5, color: color.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {feed.day.hijri}
          </div>
        </div>
      </div>

      {/* Tiles — 2 × 52 + 8 */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 52, gap: 8 }}>
        {feed.day.times.map((t) => {
          if (t.name === passedUntil) passed = false
          const isCurrent = t.name === feed.current
          const isNext = next?.name === t.name && !next.tomorrow
          const dim = passed && !isCurrent && !next?.tomorrow
          return (
            <motion.div
              key={t.name}
              className="tile"
              initial={false}
              animate={{ opacity: dim ? 0.5 : 1 }}
              style={{
                borderRadius: radius.tile,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: isCurrent ? color.accentWash : color.tile,
                outline: isNext ? `1px solid ${color.accent}` : 'none',
                outlineOffset: -1,
              }}
            >
              <div style={{ fontSize: 10.5, color: isCurrent ? color.accent : color.text.secondary, fontWeight: 600 }}>
                {t.name}
                {isCurrent && ' · now'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: color.text.strong, marginTop: 1 }}>
                {clockText(t.time)}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Crescent() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        borderRadius: radius.tile,
        background: color.accentWash,
        color: color.accent,
      }}
    >
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 4.5a7.5 7.5 0 1 0 4 10.5 6 6 0 0 1-4-10.5z" />
        <motion.path
          d="M18 4.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}
