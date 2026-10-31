import { useCallback, useEffect, useMemo, useRef } from 'react'
import { newId, useJsonStore } from './useJsonStore'
import type { Todo } from '../types/todo'

interface TodosFile {
  todos: Todo[]
}

const EMPTY: TodosFile = { todos: [] }

/** Anything this overdue at launch is marked fired quietly — `useReminders`' rule. */
const STALE_MS = 12 * 60 * 60_000

export interface TodoFeed {
  loaded: boolean
  todos: Todo[]
  /** Open tasks first (soonest due first, undated after), then done ones. */
  sorted: Todo[]
  openCount: number
  doneToday: number
  add: (title: string, dueAt: number | null, color: number) => void
  edit: (id: string, patch: Partial<Pick<Todo, 'title' | 'dueAt' | 'color'>>) => void
  toggle: (id: string) => void
  remove: (id: string) => void
  snooze: (id: string, minutes: number) => void
  clearDone: () => void
}

export function useTodos(lead: boolean, onDue: (task: Todo) => void): TodoFeed {
  const { value, loaded, update } = useJsonStore<TodosFile>('todos', EMPTY)
  const todos = value.todos

  const patch = useCallback(
    (id: string, change: (todo: Todo) => Todo) =>
      update((file) => ({ todos: file.todos.map((t) => (t.id === id ? change(t) : t)) })),
    [update],
  )

  const add = useCallback(
    (title: string, dueAt: number | null, color: number) => {
      const clean = title.trim()
      if (!clean) return
      update((file) => ({
        todos: [
          ...file.todos,
          { id: newId(), title: clean, done: false, color, createdAt: Date.now(), dueAt, firedAt: null, snoozedUntil: null },
        ],
      }))
    },
    [update],
  )

  const edit = useCallback(
    (id: string, change: Partial<Pick<Todo, 'title' | 'dueAt' | 'color'>>) =>
      // Moving the time re-arms the alert.
      patch(id, (t) => ({ ...t, ...change, ...(change.dueAt !== undefined ? { firedAt: null, snoozedUntil: null } : {}) })),
    [patch],
  )

  const toggle = useCallback(
    (id: string) => patch(id, (t) => ({ ...t, done: !t.done, snoozedUntil: null })),
    [patch],
  )

  const remove = useCallback(
    (id: string) => update((file) => ({ todos: file.todos.filter((t) => t.id !== id) })),
    [update],
  )

  const snooze = useCallback(
    (id: string, minutes: number) => patch(id, (t) => ({ ...t, snoozedUntil: Date.now() + minutes * 60_000 })),
    [patch],
  )

  const clearDone = useCallback(
    () => update((file) => ({ todos: file.todos.filter((t) => !t.done) })),
    [update],
  )

  const sorted = useMemo(() => {
    const open = todos.filter((t) => !t.done)
    const done = todos.filter((t) => t.done)
    open.sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || a.createdAt - b.createdAt)
    done.sort((a, b) => b.createdAt - a.createdAt)
    return [...open, ...done]
  }, [todos])

  const startOfDay = new Date().setHours(0, 0, 0, 0)

  // The alert tick. Every window watches, but only the lead records `firedAt`,
  // and a fired-this-session set stops the others repeating it before the
  // write reaches them.
  const due = useRef(onDue)
  due.current = onDue
  const latest = useRef(todos)
  latest.current = todos
  const announced = useRef(new Set<string>())

  useEffect(() => {
    if (!loaded) return
    const tick = () => {
      const now = Date.now()
      for (const task of latest.current) {
        if (task.done || task.dueAt === null) continue
        const at = task.snoozedUntil ?? task.dueAt
        const alreadyFired = task.snoozedUntil === null ? task.firedAt !== null : (task.firedAt ?? 0) >= task.snoozedUntil
        if (alreadyFired || at > now) continue
        const key = `${task.id}:${at}`
        if (announced.current.has(key)) continue
        announced.current.add(key)
        if (lead) patch(task.id, (t) => ({ ...t, firedAt: now }))
        if (now - at < STALE_MS) due.current(task)
      }
    }
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [loaded, lead, patch])

  return {
    loaded,
    todos,
    sorted,
    openCount: todos.filter((t) => !t.done).length,
    doneToday: todos.filter((t) => t.done && t.createdAt >= startOfDay).length,
    add,
    edit,
    toggle,
    remove,
    snooze,
    clearDone,
  }
}
