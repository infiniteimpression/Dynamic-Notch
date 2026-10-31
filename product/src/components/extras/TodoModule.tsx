import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, EmptyNote, Icon } from './ui'
import { useStickyState } from '../../hooks/useStickyState'
import { color, radius } from '../../tokens'
import { TODO_COLORS, type Todo } from '../../types/todo'
import type { TodoFeed } from '../../hooks/useTodos'

/**
 * The to-do card. Heights pinned to `size.todo` (234):
 * 26 nav + 12 + 32 add row + 8 + 4 × 36 rows + 12.
 *
 * The time is picked with one chip that steps through presets — no time
 * input, because a native picker opens outside the card and collapses the
 * notch (see CLAUDE.md). The draft is sticky, so a card that collapses under a
 * half-typed task gives it back.
 */
const ROW = 36

const WHEN: { label: string; at: () => number | null }[] = [
  { label: 'No time', at: () => null },
  { label: 'In 15 min', at: () => Date.now() + 15 * 60_000 },
  { label: 'In 30 min', at: () => Date.now() + 30 * 60_000 },
  { label: 'In 1 hour', at: () => Date.now() + 60 * 60_000 },
  { label: 'In 3 hours', at: () => Date.now() + 3 * 60 * 60_000 },
  { label: 'This evening', at: () => new Date().setHours(19, 0, 0, 0) },
  { label: 'Tomorrow 9 AM', at: () => new Date(Date.now() + 86_400_000).setHours(9, 0, 0, 0) },
]

export default function TodoModule({ feed }: { feed: TodoFeed }) {
  const [draft, setDraft] = useStickyState('todo.draft', '')
  const [when, setWhen] = useStickyState('todo.when', 0)
  const [tint, setTint] = useStickyState('todo.color', 0)

  const usable = WHEN.filter((w, i) => i === 0 || (w.at() ?? 0) > Date.now())
  const pick = usable[when % usable.length] ?? WHEN[0]

  const submit = () => {
    if (!draft.trim()) return
    feed.add(draft, pick.at(), tint)
    setDraft('')
    setWhen(0)
  }

  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
      {/* Add row — 32 */}
      <div style={{ height: 32, display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          title="Task colour"
          onClick={() => setTint((tint + 1) % TODO_COLORS.length)}
          style={{ width: 22, height: 32, display: 'grid', placeItems: 'center', flex: 'none' }}
        >
          <motion.span
            key={tint}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            style={{ width: 12, height: 12, borderRadius: radius.pill, background: TODO_COLORS[tint] }}
          />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Add a task…"
          spellCheck={false}
          className="tile"
          style={{
            flex: 1,
            minWidth: 0,
            height: 32,
            padding: '0 10px',
            border: 'none',
            outline: 'none',
            borderRadius: radius.tile,
            fontSize: 12.5,
            color: color.text.primary,
            background: color.tile,
          }}
        />
        <Button height={32} onClick={() => setWhen(when + 1)} title="When to remind you — click to change">
          <Icon size={13}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 1.5" /></Icon>
          <span style={{ fontWeight: 500, color: pick.at() ? color.text.primary : color.text.muted }}>{pick.label}</span>
        </Button>
        <Button primary height={32} onClick={submit} disabled={!draft.trim()} style={{ width: 32, padding: 0 }}>
          <Icon size={15}><path d="M12 5v14M5 12h14" /></Icon>
        </Button>
      </div>

      {/* List — 4 rows */}
      <div style={{ height: ROW * 4, marginTop: 8, overflowY: 'auto', overflowX: 'hidden' }}>
        {feed.sorted.length === 0 ? (
          <EmptyNote title="Nothing to do" body="Type a task above. Give it a time and the notch will tap you when it's due." />
        ) : (
          <AnimatePresence initial={false}>
            {feed.sorted.map((task) => (
              <Row key={task.id} task={task} feed={feed} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function Row({ task, feed }: { task: Todo; feed: TodoFeed }) {
  const [hover, setHover] = useState(false)
  const overdue = !task.done && task.dueAt !== null && (task.snoozedUntil ?? task.dueAt) < Date.now()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: ROW,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '0 6px',
        borderRadius: radius.small,
        background: hover ? color.hover : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={() => feed.toggle(task.id)}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        style={{
          width: 18,
          height: 18,
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          borderRadius: radius.pill,
          border: `1.5px solid ${task.done ? TODO_COLORS[task.color] : color.text.muted}`,
          background: task.done ? TODO_COLORS[task.color] : 'transparent',
          color: color.onAccent,
        }}
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: task.done ? 1 : 0 }} transition={{ duration: 0.22 }} />
        </svg>
      </button>
      {!task.done && <span style={{ width: 3, height: 16, borderRadius: 2, flex: 'none', background: TODO_COLORS[task.color] }} />}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: task.done ? color.text.muted : color.text.primary,
          textDecoration: task.done ? 'line-through' : 'none',
          transition: 'color 160ms ease',
        }}
      >
        {task.title}
      </span>
      {task.dueAt !== null && !task.done && (
        <span style={{ fontSize: 10.5, flex: 'none', color: overdue ? 'var(--danger)' : color.text.secondary }}>
          {dueText(task.snoozedUntil ?? task.dueAt)}
        </span>
      )}
      {hover && overdue && (
        <button
          type="button"
          title="Snooze 10 minutes"
          onClick={() => feed.snooze(task.id, 10)}
          style={{ height: 22, padding: '0 6px', flex: 'none', borderRadius: radius.small, fontSize: 10.5, fontWeight: 600, color: color.accent, background: color.accentWash }}
        >
          +10m
        </button>
      )}
      {hover && (
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => feed.remove(task.id)}
          style={{ width: 22, height: 22, flex: 'none', display: 'grid', placeItems: 'center', color: color.text.muted }}
        >
          <Icon size={13}><path d="M6 6l12 12M18 6L6 18" /></Icon>
        </button>
      )}
    </motion.div>
  )
}

function dueText(at: number) {
  const d = new Date(at)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const today = new Date().toDateString() === d.toDateString()
  if (today) return time
  const tomorrow = new Date(Date.now() + 86_400_000).toDateString() === d.toDateString()
  return tomorrow ? `Tmrw ${time}` : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
