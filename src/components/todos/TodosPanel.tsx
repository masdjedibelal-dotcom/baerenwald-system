'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import {
  listTodos,
  setTodoErledigt,
  type TodoListFilter,
} from '@/app/(dashboard)/kalender/todo-actions'
import {
  TodoCheckButton,
  TodoEditorSheet,
  TodoPrioFlag,
  type TodoLockedLinks,
} from '@/components/todos/TodoEditorSheet'
import { toast } from '@/components/ui/app-toast'
import type { CrmTodo } from '@/lib/types'
import { cn } from '@/lib/utils'

function formatFrist(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function isOverdue(iso: string | null, erledigt: boolean): boolean {
  if (erledigt || !iso) return false
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const due = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return due.getTime() < today.getTime()
}

function linkLabel(t: CrmTodo): string | null {
  const parts: string[] = []
  if (t.kunden?.name) parts.push(t.kunden.name)
  if (t.auftraege?.titel) parts.push(t.auftraege.titel)
  else if (t.leads?.kontakt_name) parts.push(t.leads.kontakt_name)
  if (t.handwerker) {
    const hw = t.handwerker.firma?.trim() || t.handwerker.name
    if (hw) parts.push(hw)
  }
  return parts.length ? parts.join(' · ') : null
}

type ViewMode = 'offen' | 'erledigt'

/**
 * To-dos im Stil Apple Erinnerungen: Kartenliste, + oben rechts,
 * Filter Offen | Erledigt, Abhaken → durchgestrichen und aus Offen weg.
 */
export function TodosPanel({
  filter,
  lockedLinks,
  compact,
  title = 'To-dos',
  showFilterChips = true,
}: {
  filter?: TodoListFilter
  lockedLinks?: TodoLockedLinks
  compact?: boolean
  title?: string
  showFilterChips?: boolean
}) {
  const [todos, setTodos] = useState<CrmTodo[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('offen')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTodo | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [leavingIds, setLeavingIds] = useState<Set<string>>(() => new Set())
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoadErr(null)
    const res = await listTodos({
      ...filter,
      erledigt: view === 'erledigt',
    })
    if (!res.ok) {
      setLoadErr(res.message)
      return
    }
    setTodos(res.todos)
    setLeavingIds(new Set())
  }, [filter, view])

  useEffect(() => {
    void load()
  }, [load])

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(t: CrmTodo) {
    setEditing(t)
    setEditorOpen(true)
  }

  function toggle(t: CrmTodo) {
    const nextDone = !t.erledigt
    setBusyId(t.id)

    if (view === 'offen' && nextDone) {
      setLeavingIds((prev) => new Set(prev).add(t.id))
      setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, erledigt: true } : x)))
    } else if (view === 'erledigt' && !nextDone) {
      setLeavingIds((prev) => new Set(prev).add(t.id))
      setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, erledigt: false } : x)))
    } else {
      setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, erledigt: nextDone } : x)))
    }

    startTransition(async () => {
      const res = await setTodoErledigt(t.id, nextDone)
      setBusyId(null)
      if (!res.ok) {
        toast.error(res.message)
        await load()
        return
      }
      if (view === 'offen' && nextDone) {
        window.setTimeout(() => {
          setTodos((prev) => prev.filter((x) => x.id !== t.id))
          setLeavingIds((prev) => {
            const n = new Set(prev)
            n.delete(t.id)
            return n
          })
        }, 320)
        return
      }
      if (view === 'erledigt' && !nextDone) {
        window.setTimeout(() => {
          setTodos((prev) => prev.filter((x) => x.id !== t.id))
          setLeavingIds((prev) => {
            const n = new Set(prev)
            n.delete(t.id)
            return n
          })
        }, 320)
        return
      }
      await load()
    })
  }

  const emptyLabel =
    view === 'erledigt' ? 'Keine erledigten To-dos' : 'Keine offenen To-dos'

  return (
    <div className={cn('todos-panel', compact && 'todos-panel--compact')}>
      <div className="todos-panel__head">
        {!compact ? <h2 className="todos-panel__title">{title}</h2> : <span />}
        <div className="todos-panel__head-actions">
          {showFilterChips ? (
            <div className="todos-panel__chips" role="group" aria-label="Filter">
              <button
                type="button"
                className={cn('chip', view === 'offen' && 'on')}
                onClick={() => setView('offen')}
              >
                Offen
              </button>
              <button
                type="button"
                className={cn('chip', view === 'erledigt' && 'on')}
                onClick={() => setView('erledigt')}
              >
                Erledigt
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="todos-panel__add"
            onClick={openNew}
            aria-label="To-do hinzufügen"
            title="Hinzufügen"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {loadErr ? <p className="text-[length:var(--fs-meta)] text-[var(--red-tx)]">{loadErr}</p> : null}

      <div className="todo-card">
        <ul className="todo-list" aria-label={view === 'erledigt' ? 'Erledigte To-dos' : 'Offene To-dos'}>
          {todos.length === 0 ? (
            <li className="todo-empty">{emptyLabel}</li>
          ) : (
            todos.map((t) => {
              const frist = formatFrist(t.faellig_am)
              const link = linkLabel(t)
              const leaving = leavingIds.has(t.id)
              const done = t.erledigt
              return (
                <li
                  key={t.id}
                  className={cn('todo-card__item', leaving && 'todo-card__item--leaving')}
                >
                  <button type="button" className={cn('todo-row', done && 'todo-row--done')} onClick={() => openEdit(t)}>
                    <TodoCheckButton
                      erledigt={done}
                      busy={busyId === t.id}
                      onToggle={() => toggle(t)}
                    />
                    <div className="todo-row__main">
                      <div className="todo-row__title">
                        <TodoPrioFlag prioritaet={t.prioritaet} />
                        <span>{t.titel}</span>
                      </div>
                      {(frist || link) && !done ? (
                        <div className="todo-row__meta">
                          {frist ? (
                            <span className={cn(isOverdue(t.faellig_am, false) && 'todo-row__overdue')}>
                              {frist}
                            </span>
                          ) : null}
                          {frist && link ? <span aria-hidden> · </span> : null}
                          {link ? <span>{link}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>

      <TodoEditorSheet
        open={editorOpen}
        todo={editing}
        lockedLinks={lockedLinks}
        onClose={() => {
          setEditorOpen(false)
          setEditing(null)
        }}
        onSaved={() => void load()}
      />
    </div>
  )
}
