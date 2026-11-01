import { AnimatePresence, motion } from 'framer-motion'
import MascotEyes from './MascotEyes'
import { useClock } from '../../hooks/useClock'
import type { MascotMood } from '../../hooks/useHud'
import type { MediaSession } from '../../hooks/useMediaSession'
import { color } from '../../tokens'
import type { BatteryStatus } from '../../types/system'
import { elapsedFraction, phaseOf, type TimerState } from '../../types/timer'

/**
 * Holm's resting pill, Nusa-style: one small mark on the left and the time,
 * nothing else. Replaces Crest's three-column pill, which was built to carry
 * the weather and a timer chip side by side and is too wide for this shape.
 *
 * The mark is, in order: a running timer's ring, the equalizer while music
 * plays, or the battery ring. On a desktop PC with no battery and nothing
 * going on, the clock sits alone in the middle.
 *
 * After a quiet spell on the desktop the clock gives way to the eyes.
 */
export default function HolmPill({
  session,
  battery,
  timer,
  now,
  mood,
}: {
  session: MediaSession
  battery: BatteryStatus | null
  timer: TimerState
  now: number
  mood: MascotMood
}) {
  const clock = useClock()
  const isPlaying = session.media?.isPlaying ?? false
  const hasTimer = phaseOf(timer) !== 'idle'
  const showEyes = mood !== 'awake' && !hasTimer && !isPlaying

  const parts = clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(' ')
  const time = parts[0]
  const suffix = parts.slice(1).join(' ')

  const mark = hasTimer ? (
    <Ring fraction={1 - elapsedFraction(timer, now)} tint={color.accent} />
  ) : isPlaying ? (
    <Eq />
  ) : battery && battery.percent !== null ? (
    <BatteryRing battery={battery} />
  ) : null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '0 14px',
      }}
    >
      {mark}
      <div style={{ display: 'grid', placeItems: 'center', minWidth: 62 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {showEyes ? (
            <motion.div
              key="eyes"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <MascotEyes mood={mood as Exclude<MascotMood, 'awake'>} />
            </motion.div>
          ) : (
            <motion.div
              key="clock"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              style={{ display: 'flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap' }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '-.01em',
                  color: color.text.primary,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {time}
              </span>
              {suffix && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: color.text.primary }}>{suffix}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const SIZE = 18

/** A thin progress ring, the stroke weight Nusa draws its battery at. */
function Ring({ fraction, tint, children }: { fraction: number; tint: string; children?: React.ReactNode }) {
  const r = 7.2
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 18 18" width={SIZE} height={SIZE} style={{ flex: 'none' }}>
      <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={1.8} />
      <motion.circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, fraction))) }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        transform="rotate(-90 9 9)"
      />
      {children}
    </svg>
  )
}

function BatteryRing({ battery }: { battery: BatteryStatus }) {
  const pct = battery.percent ?? 0
  const charging = battery.charging || (battery.acPower && pct >= 99)
  const tint = charging ? '#30d158' : pct <= 15 ? '#ff453a' : pct <= 30 ? '#ffd60a' : '#fff'
  return (
    <span title={`${pct}%${battery.charging ? ', charging' : ''}`} style={{ display: 'flex' }}>
      <Ring fraction={pct / 100} tint={tint}>
        {charging && <path d="M9.8 4.6L6.6 9.6h2.3l-.7 3.8 3.2-5h-2.3z" fill={tint} />}
      </Ring>
    </span>
  )
}

function Eq() {
  return (
    <span role="img" aria-label="Playing" style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 14, flex: 'none' }}>
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className="eq"
          style={{
            width: 2.5,
            height: 12,
            borderRadius: 2,
            background: color.accent,
            animationDelay: `${delay}s`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </span>
  )
}
