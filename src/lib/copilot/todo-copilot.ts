import 'server-only'

import {
  deleteTodo,
  listTodos,
  saveTodo,
  setTodoErledigt,
  type TodoSaveInput,
} from '@/app/(dashboard)/kalender/todo-actions'
import type { CrmTodo, TodoPrioritaet } from '@/lib/types'

function daysUntil(ymd: string | null | undefined): number | null {
  if (!ymd?.trim()) return null
  const d = ymd.slice(0, 10)
  const t = new Date(`${d}T12:00:00`)
  if (Number.isNaN(t.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((t.getTime() - today.getTime()) / 86400000)
}

/** Offene To-dos mit Priorität für den Assistenten. */
export async function listTodosCopilot(input?: {
  erledigt?: boolean | 'all'
  nur_wichtige?: boolean
  kunde_id?: string
  lead_id?: string
  auftrag_id?: string
  limit?: number
}) {
  const res = await listTodos({
    erledigt: input?.erledigt ?? false,
    kundeId: input?.kunde_id,
    leadId: input?.lead_id,
    auftragId: input?.auftrag_id,
    limit: input?.limit ?? 50,
  })
  if (!res.ok) return { error: res.message }

  let todos = res.todos
  if (input?.nur_wichtige) {
    todos = todos.filter((t) => {
      if (t.erledigt) return false
      if (t.prioritaet === 'hoch') return true
      const d = daysUntil(t.faellig_am)
      return d != null && d <= 3
    })
  }

  const mapped = todos.map((t) => summarizeTodo(t))
  return {
    anzahl: mapped.length,
    todos: mapped,
    hinweis:
      mapped.length === 0
        ? 'Keine passenden To-dos.'
        : 'Für Anlegen: save_todo. Für Erledigt: set_todo_erledigt.',
  }
}

function summarizeTodo(t: CrmTodo) {
  const kunde = t.kunden ?? null
  const lead = t.leads ?? null
  const auftrag = t.auftraege ?? null
  const d = daysUntil(t.faellig_am)
  return {
    id: t.id,
    titel: t.titel,
    beschreibung: t.beschreibung,
    prioritaet: t.prioritaet,
    faellig_am: t.faellig_am,
    tage_bis_faellig: d,
    ueberfaellig: d != null && d < 0,
    erledigt: t.erledigt,
    kunde: kunde ? { id: kunde.id, name: kunde.name } : null,
    lead: lead ? { id: lead.id, name: lead.kontakt_name } : null,
    auftrag: auftrag ? { id: auftrag.id, titel: auftrag.titel } : null,
  }
}

export async function saveTodoCopilot(input: {
  id?: string
  titel: string
  beschreibung?: string
  faellig_am?: string
  prioritaet?: TodoPrioritaet
  kunde_id?: string
  lead_id?: string
  auftrag_id?: string
  handwerker_id?: string
  zugewiesen_an?: string
}) {
  const payload: TodoSaveInput = {
    id: input.id,
    titel: input.titel,
    beschreibung: input.beschreibung ?? null,
    faellig_am: input.faellig_am ?? null,
    prioritaet: input.prioritaet ?? 'normal',
    kunde_id: input.kunde_id ?? null,
    lead_id: input.lead_id ?? null,
    auftrag_id: input.auftrag_id ?? null,
    handwerker_id: input.handwerker_id ?? null,
    zugewiesen_an: input.zugewiesen_an ?? null,
  }
  const res = await saveTodo(payload)
  if (!res.ok) return { error: res.message }
  return { ok: true, id: res.id, hinweis: 'To-do gespeichert. Link: /kalender (To-dos) oder Entity-Detail.' }
}

export async function setTodoErledigtCopilot(id: string, erledigt = true) {
  const res = await setTodoErledigt(id, erledigt)
  if (!res.ok) return { error: res.message }
  return { ok: true, id, erledigt }
}

export async function deleteTodoCopilot(id: string) {
  const res = await deleteTodo(id)
  if (!res.ok) return { error: res.message }
  return { ok: true, geloescht: id }
}
