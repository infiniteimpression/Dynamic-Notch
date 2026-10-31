import { motion, useReducedMotion } from 'framer-motion'
import { Button, Icon } from './ui'
import { color, font, radius, sectionLabel } from '../../tokens'
import type { WaterFeed } from '../../hooks/useWater'

/**
 * The water card. Heights are pinned to `size.water` (224):
 * 26 nav + 14 + 56 readout + 10 + 64 chart + 10 + 30 buttons + 14.
 */
export default function WaterModule({ feed }: { feed: WaterFeed }) {
  const share = Math.min(1, feed.drankMl / Math.max(1, feed.goalMl))
  const left = Math.max(0, feed.goalMl - feed.drankMl)
  const glassesLeft = Math.ceil(left / Math.max(1, feed.sipMl))
  const peak = Math.max(feed.sipMl * 2, ...feed.buckets.map((b) => b.ml))

  return (
    <div style={{ height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Readout — 56 */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Glass share={share} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <motion.span
              key={feed.drankMl}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ fontFamily: font.display, fontSize: 26, fontWeight: 600, color: color.text.strong }}
            >
              {(feed.drankMl / 1000).toFixed(2).replace(/0$/, '')}
            </motion.span>
            <span style={{ fontSize: 12, color: color.text.secondary }}>
              / {(feed.goalMl / 1000).toFixed(1)} L
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: share >= 1 ? color.accent : color.text.secondary }}>
            {share >= 1
              ? 'Goal reached today'
              : `${Math.round(share * 100)}% · ${glassesLeft} glass${glassesLeft === 1 ? '' : 'es'} to go`}
          </div>
        </div>
        <Streak history={feed.history} goal={feed.goalMl} />
      </div>

      {/* Chart — 64 */}
      <div style={{ height: 64, marginTop: 10, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {feed.buckets.map((bucket) => (
          <div key={bucket.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <motion.div
                initial={false}
                animate={{ height: `${Math.max(bucket.ml ? 10 : 4, (bucket.ml / peak) * 100)}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                style={{
                  width: '100%',
                  borderRadius: 4,
                  background: bucket.ml ? color.accent : color.scrubTrack,
                }}
              />
            </div>
            <div style={{ height: 11, fontSize: 9, textAlign: 'center', color: color.text.muted }}>{bucket.label}</div>
          </div>
        ))}
      </div>

      {/* Buttons — 30 */}
      <div style={{ height: 30, marginTop: 10, display: 'flex', gap: 8 }}>
        <Button primary onClick={() => feed.drink()} style={{ flex: 1 }}>
          <Icon size={14}><path d="M12 5v14M5 12h14" /></Icon>
          Drink {feed.sipMl} ml
        </Button>
        <Button onClick={() => feed.drink(feed.sipMl * 2)}>+{feed.sipMl * 2}</Button>
        <Button onClick={feed.undo} disabled={!feed.canUndo} title="Undo the last glass">
          <Icon size={14}><path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 0 1 0 10h-2" /></Icon>
        </Button>
      </div>
    </div>
  )
}

/** A glass that fills, with a gently moving surface. */
function Glass({ share }: { share: number }) {
  const still = useReducedMotion() ?? false
  const top = 50 - share * 44
  return (
    <svg viewBox="0 0 44 56" width={44} height={56} style={{ flex: 'none' }}>
      <defs>
        <clipPath id="water-glass">
          <path d="M6 4h32l-4 46a4 4 0 0 1-4 3.6H14A4 4 0 0 1 10 50z" />
        </clipPath>
      </defs>
      <g clipPath="url(#water-glass)">
        <rect x="0" y="0" width="44" height="56" fill={color.scrubTrack} />
        <motion.g initial={false} animate={{ y: top }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
          <motion.path
            d="M-44 4 q11 -4 22 0 t22 0 t22 0 t22 0 t22 0 V60 H-44z"
            fill={color.accent}
            animate={still ? undefined : { x: [0, 44] }}
            transition={still ? undefined : { duration: 2.4, ease: 'linear', repeat: Infinity }}
          />
        </motion.g>
      </g>
      <path
        d="M6 4h32l-4 46a4 4 0 0 1-4 3.6H14A4 4 0 0 1 10 50z"
        fill="none"
        stroke={color.text.icon}
        strokeWidth={1.5}
      />
    </svg>
  )
}

/** Seven dots for the last week: filled where the goal was met. */
function Streak({ history, goal }: { history: { day: string; ml: number }[]; goal: number }) {
  const week = history.slice(-7)
  return (
    <div style={{ flex: 'none', textAlign: 'right' }}>
      <div style={{ ...sectionLabel, fontSize: 9 }}>Last 7 days</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
        {week.map((d) => (
          <span
            key={d.day}
            title={`${d.day}: ${d.ml} ml`}
            style={{
              width: 8,
              height: 8,
              borderRadius: radius.pill,
              background: d.ml >= goal ? color.accent : d.ml > 0 ? color.accentWash : color.scrubTrack,
            }}
          />
        ))}
      </div>
    </div>
  )
}
