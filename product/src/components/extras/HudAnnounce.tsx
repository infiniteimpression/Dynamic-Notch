import { motion, useReducedMotion } from 'framer-motion'
import Banner, { Glyph } from './Banner'
import { color, radius } from '../../tokens'
import type { HudEvent } from '../../types/extras'

/**
 * Volume, brightness, Caps Lock and keyboard language.
 *
 * The level bar is the point of the volume and brightness banners, so it
 * springs rather than jumps: holding a volume key re-announces every 100 ms,
 * the banner's cross-fade key is constant per kind (see `announceKey`), and so
 * the same bar is retargeted on every step and glides between them the way
 * Windows' own flyout does.
 */
export default function HudAnnounce({ hud }: { hud: HudEvent }) {
  switch (hud.kind) {
    case 'volume':
      return (
        <Banner
          ping={false}
          glyph={<SpeakerGlyph level={hud.muted ? 0 : hud.level} muted={hud.muted} />}
          kicker="Volume"
          title={hud.muted ? 'Muted' : `${hud.level}%`}
          trailing={<LevelBar level={hud.muted ? 0 : hud.level} />}
        />
      )
    case 'brightness':
      return (
        <Banner
          ping={false}
          glyph={<SunGlyph level={hud.level} />}
          kicker="Brightness"
          title={`${hud.level}%`}
          trailing={<LevelBar level={hud.level} />}
        />
      )
    case 'capsLock':
      return (
        <Banner
          glyph={<CapsGlyph on={hud.on} />}
          kicker="Keyboard"
          title={hud.on ? 'Caps Lock is on' : 'Caps Lock is off'}
          sub={hud.on ? 'TYPING IN CAPITALS' : 'back to normal letters'}
        />
      )
    case 'language':
      return (
        <Banner
          glyph={<Glyph><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5S14.4 18.2 12 20.5M12 3.5C9.6 5.8 8.4 8.6 8.4 12s1.2 6.2 3.6 8.5" /></Glyph>}
          kicker="Input language"
          title={languageName(hud.locale)}
          sub="for the window you're typing in"
          trailing={<CodeChip code={hud.locale.split('-')[0]?.toUpperCase() ?? '??'} />}
        />
      )
  }
}

/** "ur-PK" → "Urdu (Pakistan)", in English so it reads the same whatever was picked. */
function languageName(locale: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale
  } catch {
    return locale
  }
}

function LevelBar({ level }: { level: number }) {
  const still = useReducedMotion() ?? false
  return (
    <div
      style={{
        width: 92,
        height: 6,
        flex: 'none',
        borderRadius: radius.pill,
        background: color.scrubTrack,
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, level))}%` }}
        transition={still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        style={{ height: '100%', borderRadius: radius.pill, background: color.accent }}
      />
    </div>
  )
}

function CodeChip({ code }: { code: string }) {
  return (
    <div
      className="tile"
      style={{
        flex: 'none',
        minWidth: 34,
        height: 24,
        padding: '0 8px',
        borderRadius: radius.small,
        display: 'grid',
        placeItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.06em',
        color: color.accent,
        background: color.accentWash,
      }}
    >
      {code}
    </div>
  )
}

function SpeakerGlyph({ level, muted }: { level: number; muted: boolean }) {
  const waves = muted ? 0 : level === 0 ? 0 : level < 34 ? 1 : level < 67 ? 2 : 3
  return (
    <Glyph>
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      {muted && <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={['M15.5 10.2a2.6 2.6 0 0 1 0 3.6', 'M17.6 8.2a5.4 5.4 0 0 1 0 7.6', 'M19.7 6.2a8.2 8.2 0 0 1 0 11.6'][i]}
          initial={false}
          animate={{ opacity: i < waves ? 1 : 0, pathLength: i < waves ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        />
      ))}
    </Glyph>
  )
}

function SunGlyph({ level }: { level: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => i)
  const reach = 1.5 + (level / 100) * 2
  return (
    <Glyph>
      <motion.circle cx="12" cy="12" initial={false} animate={{ r: 3 + level / 60 }} />
      {rays.map((i) => {
        const a = (i * Math.PI) / 4
        const r0 = 6.6
        return (
          <motion.line
            key={i}
            initial={false}
            x1={12 + Math.cos(a) * r0}
            y1={12 + Math.sin(a) * r0}
            animate={{ x2: 12 + Math.cos(a) * (r0 + reach), y2: 12 + Math.sin(a) * (r0 + reach) }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )
      })}
    </Glyph>
  )
}

function CapsGlyph({ on }: { on: boolean }) {
  return (
    <Glyph>
      <path d="M12 4.5l6.5 7h-3.8v4H9.3v-4H5.5z" fill={on ? 'currentColor' : 'none'} />
      <motion.path
        d="M8.5 19.5h7"
        initial={false}
        animate={{ opacity: on ? 1 : 0.25 }}
      />
    </Glyph>
  )
}
