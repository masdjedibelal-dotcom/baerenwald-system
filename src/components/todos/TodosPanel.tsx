'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  listTodos,
  saveTodo,
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
  const [showDone, setShowDone] = useState(false)
  const [quick, setQuick] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTodo | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoadErr(null)
    const res = await listTodos({
      ...filter,
      erledigt: showDone ? 'all' : false,
    })
    if (!res.ok) {
      setLoadErr(res.message)
      return
    }
    setTodos(res.todos)
  }, [filter, showDone])

  useEffect(() => {
    void load()
  }, [load])

  const open = useMemo(() => todos.filter((t) => !t.erledigt), [todos])
  const done = useMemo(() => todos.filter((t) => t.erledigt), [todos])

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(t: CrmTodo) {
    setEditing(t)
    setEditorOpen(true)
  }

  function addQuick() {
    const titel = quick.trim()
    if (!titel) return
    startTransition(async () => {
      const res = await saveTodo({
        titel,
        kunde_id: lockedLinks?.kundeId ?? null,
        lead_id: lockedLinks?.leadId ?? null,
        auftrag_id: lockedLinks?.auftragId ?? null,
        handwerker_id: lockedLinks?.handwerkerId ?? null,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setQuick('')
      await load()
    })
  }

  function toggle(t: CrmTodo) {
    setBusyId(t.id)
    startTransition(async () => {
      const res = await setTodoErledigt(t.id, !t.erledigt)
      setBusyId(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      await load()
    })
  }

  return (
    <div className={cn('todos-panel', compact && 'todos-panel--compact')}>
      {!compact ? (
        <div className="todos-panel__head">
          <h2 className="todos-panel__title">{title}</h2>
          {showFilterChips ? (
            <div className="todos-panel__chips" role="group" aria-label="Filter">
              <button
                type="button"
                className={cn('chip', !showDone && 'on')}
                onClick={() => setShowDone(false)}
              >
                Offen
              </button>
              <button
                type="button"
                className={cn('chip', showDone && 'on')}
                onClick={() => setShowDone(true)}
              >
                Alle
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="todo-quick">
        <input
          className="todo-quick__input"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addQuick()
            }
          }}
          placeholder="Neues To-do…"
          aria-label="Neues To-do"
          disabled={pending}
        />
        <button
          type="button"
          className="todo-quick__add"
          disabled={pending || !quick.trim()}
          onClick={addQuick}
        >
          Hinzufügen
        </button>
      </div>

      {loadErr ? <p className="text-[length:var(--fs-meta)] text-[var(--red-tx)]">{loadErr}</p> : null}

      <ul className="todo-list" aria-label="Offene To-dos">
        {open.length === 0 ? (
          <li className="todo-empty">Keine offenen To-dos</li>
        ) : (
          open.map((t) => {
            const frist = formatFrist(t.faellig_am)
            const link = linkLabel(t)
            return (
              <li key={t.id}>
                <button type="button" className="todo-row" onClick={() => openEdit(t)}>
                  <TodoCheckButton
                    erledigt={false}
                    busy={busyId === t.id}
                    onToggle={() => toggle(t)}
                  />
                  <div className="todo-row__main">
                    <div className="todo-row__title">
                      <TodoPrioFlag prioritaet={t.prioritaet} />
                      <span>{t.titel}</span>
                    </div>
                    {(frist || link) && (
                      <div className="todo-row__meta">
                        {frist ? (
                          <span className={cn(isOverdue(t.faellig_am, false) && 'todo-row__overdue')}>
                            {frist}
                          </span>
                        ) : null}
                        {frist && link ? <span aria-hidden> · </span> : null}
                        {link ? <span>{link}</span> : null}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="todo-row__chev h-4 w-4" aria-hidden />
                </button>
              </li>
            )
          })
        )}
      </ul>

      {showDone && done.length > 0 ? (
        <div className="todo-done-block">
          <div className="todo-done-block__label">Erledigt</div>
          <ul className="todo-list">
            {done.map((t) => (
              <li key={t.id}>
                <button type="button" className="todo-row todo-row--done" onClick={() => openEdit(t)}>
                  <TodoCheckButton
                    erledigt
                    busy={busyId === t.id}
                    onToggle={() => toggle(t)}
                  />
                  <div className="todo-row__main">
                    <div className="todo-row__title">
                      <span>{t.titel}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact ? (
        <div className="todos-panel__foot">
          <button type="button" className="btn ghost sm" onClick={openNew}>
            Details hinzufügen…
          </button>
        </div>
      ) : null}

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
