import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { color } from '../../tokens'
import type { MascotMood } from '../../hooks/useHud'

/**
 * The little companion that takes the clock's place on an empty desk.
 *
 * Drowsy: heavy lids and slow blinks. Asleep: shut, with z's drifting up.
 * Waving: when someone comes back, happy ^ ^ eyes and a small wave, then the
 * clock returns. Awake eyes are never drawn — the pill shows the time then.
 *
 * Everything is transform and opacity, so the compositor does the work and
 * the rest of the pill never re-lays out.
 */
export default function MascotEyes({ mood }: { mood: Exclude<MascotMood, 'awake'> }) {
  const still = useReducedMotion() ?? false
  const blink = useBlink((mood === 'drowsy' || mood === 'looking') && !still)
  const gaze = useGaze(mood === 'looking' && !still)

  const lid =
    mood === 'asleep' ? 0.14 : mood === 'drowsy' ? (blink ? 0.1 : 0.5) : blink ? 0.12 : 1

  return (
    <div
      aria-label={
        mood === 'asleep' ? 'Sleeping' : mood === 'waving' ? 'Hello again' : mood === 'looking' ? 'Looking around' : 'Getting sleepy'
      }
      role="img"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, height: 20 }}
    >
      {[0, 1].map((i) =>
        mood === 'waving' ? (
          <motion.svg
            key={`happy-${i}`}
            viewBox="0 0 12 8"
            width={12}
            height={8}
            initial={{ y: 3, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, delay: i * 0.05 }}
          >
            <path d="M1.5 6.5Q6 -0.5 10.5 6.5" fill="none" stroke={color.text.primary} strokeWidth={2.2} strokeLinecap="round" />
          </motion.svg>
        ) : (
          <motion.span
            key={`eye-${i}`}
            initial={false}
            animate={{ scaleY: lid, x: gaze }}
            transition={{
              scaleY: { type: 'spring', stiffness: 520, damping: 28 },
              x: { type: 'spring', stiffness: 160, damping: 18 },
            }}
            style={{
              width: 7,
              height: 13,
              borderRadius: 4,
              background: color.text.primary,
              transformOrigin: '50% 70%',
            }}
          />
        ),
      )}

      {mood === 'waving' && !still && (
        <motion.span
          initial={{ opacity: 0, x: -2 }}
          animate={{ opacity: 1, x: 0, rotate: [0, 18, -8, 18, -4, 0] }}
          transition={{ duration: 1.1 }}
          style={{ position: 'absolute', right: -16, top: -2, fontSize: 11, transformOrigin: '70% 90%' }}
        >
          👋
        </motion.span>
      )}

      <AnimatePresence>
        {mood === 'asleep' && !still && <Zs />}
      </AnimatePresence>
    </div>
  )
}

/** Three z's rising and fading on a loop, staggered. */
function Zs() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'absolute', right: -14, top: -6, width: 14, height: 20, pointerEvents: 'none' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [6, -8], x: [0, 4], opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            fontSize: 7 + i,
            fontWeight: 700,
            color: color.text.secondary,
          }}
        >
          z
        </motion.span>
      ))}
    </motion.span>
  )
}

/** Where the eyes are looking, in px: a glance left or right now and then. */
function useGaze(active: boolean) {
  const [x, setX] = useState(0)
  useEffect(() => {
    if (!active) {
      setX(0)
      return
    }
    const id = window.setInterval(() => {
      const r = Math.random()
      setX(r < 0.35 ? -2.5 : r < 0.7 ? 2.5 : 0)
    }, 2600)
    return () => window.clearInterval(id)
  }, [active])
  return x
}

/** A slow, irregular blink. */
function useBlink(active: boolean) {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (!active) return
    let timer = 0
    const loop = () => {
      timer = window.setTimeout(() => {
        setClosed(true)
        timer = window.setTimeout(() => {
          setClosed(false)
          loop()
        }, 260)
      }, 2200 + Math.random() * 2600)
    }
    loop()
    return () => window.clearTimeout(timer)
  }, [active])
  return closed
}
