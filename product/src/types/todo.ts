/**
 * A to-do. Stored in `todos.json` through the generic store.
 *
 * `dueAt` is an instant (Unix millis), never a wall-clock string — the rule
 * `reminders.rs` set for the same reason. `firedAt` is persisted so a relaunch
 * (and the app relaunches on every update) does not replay a task's alert.
 */
export interface Todo {
  id: string
  title: string
  done: boolean
  /** One of `TODO_COLORS`, by index. */
  color: number
  createdAt: number
  dueAt: number | null
  firedAt: number | null
  /** Set by Snooze: the alert comes back at this instant instead. */
  snoozedUntil: number | null
}

/** Task colours, as CSS. Kept few and distinct so they read at a dot's size. */
export const TODO_COLORS = ['var(--accent)', '#34d399', '#f59e0b', '#f472b6', '#60a5fa'] as const
