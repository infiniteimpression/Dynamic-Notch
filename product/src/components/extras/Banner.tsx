import type { ReactNode } from 'react'
import { GlyphTile } from '../system/SystemGlyphs'
import { color } from '../../tokens'

/**
 * The shared shape of every banner this fork added: a glyph tile, a small
 * uppercase kicker, a title and one line under it — the layout `TimerAnnounce`
 * and the rest already use, written once here so the new banners cannot drift
 * from it or from each other.
 *
 * `trailing` is for the one thing a banner carries beside its text (a level
 * readout, a short language code), kept out of the text column so a long title
 * ellipsises before it ever pushes the readout.
 */
export default function Banner({
  glyph,
  kicker,
  title,
  sub,
  trailing,
  ping = true,
  tint,
}: {
  glyph: ReactNode
  kicker: string
  title: ReactNode
  sub?: ReactNode
  trailing?: ReactNode
  ping?: boolean
  /** Ring and wash colour for the tile. Defaults to the accent. */
  tint?: string
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: color.text.strong,
      }}
    >
      <GlyphTile ping={ping} live accent={tint}>
        {glyph}
      </GlyphTile>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: color.text.muted,
          }}
        >
          {kicker}
        </div>
        <div style={{ ...line, fontSize: 13, fontWeight: 600, letterSpacing: '-.01em', marginTop: 1 }}>
          {title}
        </div>
        {sub && <div style={{ ...line, fontSize: 11, color: color.text.secondary }}>{sub}</div>}
      </div>

      {trailing}
    </div>
  )
}

const line = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

/** A 22px stroke-only glyph, the weight `SystemGlyphs` draws at. */
export function Glyph({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}
