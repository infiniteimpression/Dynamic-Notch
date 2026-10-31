import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { color, radius } from '../../tokens'

/**
 * The few controls the new cards share. Inline styles off `tokens.ts`, like the
 * rest of the product — never a native control, for the reason CLAUDE.md gives:
 * an OS popup opens outside the card's hit rect and collapses the notch.
 */
export function Button({
  children,
  onClick,
  primary,
  disabled,
  height = 30,
  tint,
  style,
  title,
}: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  height?: number
  /** A fill colour for a primary button other than the accent (Fiverr green). */
  tint?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <motion.button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={primary ? undefined : 'tile'}
      style={{
        height,
        padding: '0 12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 'none',
        borderRadius: radius.tile,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: primary ? color.onAccent : color.text.primary,
        background: primary ? (tint ?? color.accent) : color.tile,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

/** A 16px stroke icon at the card weight. */
export function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none' }}
    >
      {children}
    </svg>
  )
}

/** A centred, muted sentence for a card with nothing to show yet. */
export function EmptyNote({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 28px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: color.text.primary }}>{title}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.45, color: color.text.secondary }}>{body}</div>
    </div>
  )
}
