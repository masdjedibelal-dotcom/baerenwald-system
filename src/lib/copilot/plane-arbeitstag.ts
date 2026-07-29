import 'server-only'

import {
  getAuftragStatus,
  getHeutigeTermine,
  getNeueAnfragen,
  getOffeneAngebote,
  getOffeneRechnungen,
} from '@/lib/copilot/tools'
import { listTodosCopilot } from '@/lib/copilot/todo-copilot'

/** Kurzer Arbeitsplan aus Live-CRM-Daten — für Planung im Assistenten. */
export async function planeArbeitstag() {
  const [anfragen, termine, rechnungen, angebote, auftraege, todos] = await Promise.all([
    getNeueAnfragen(),
    getHeutigeTermine(),
    getOffeneRechnungen(),
    getOffeneAngebote(),
    getAuftragStatus(),
    listTodosCopilot({ nur_wichtige: true, limit: 20 }),
  ])

  const heute = new Date().toISOString().slice(0, 10)
  const ueberfaellig = (
    rechnungen as Array<{
      faellig_am?: string | null
      id: string
      rechnungsnummer?: string
    }>
  ).filter((r) => r.faellig_am && r.faellig_am.slice(0, 10) < heute)

  const todoList = 'todos' in todos && Array.isArray(todos.todos) ? todos.todos : []

  const fokus: string[] = []
  if (termine.length) fokus.push(`${termine.length} Termin(e) heute`)
  if (anfragen.length) fokus.push(`${anfragen.length} neue Anfrage(n)`)
  if (todoList.length) fokus.push(`${todoList.length} wichtige To-do(s)`)
  if (ueberfaellig.length) fokus.push(`${ueberfaellig.length} überfällige Rechnung(en)`)
  else if (rechnungen.length) fokus.push(`${rechnungen.length} offene Rechnung(en)`)
  if (angebote.length) fokus.push(`${angebote.length} offene Angebot(e)`)
  if (auftraege.length) fokus.push(`${auftraege.length} aktive Auftrag/Aufträge`)

  const schritte: string[] = []
  if (termine.length) schritte.push('Termine abarbeiten / bestätigen')
  if (todoList.length) schritte.push('Wichtige To-dos erledigen oder delegieren')
  if (anfragen.length) schritte.push('Neue Anfragen triagieren → Angebot oder Rückruf')
  if (ueberfaellig.length) schritte.push('Überfällige Rechnungen: Mahnung prüfen')
  if (angebote.length) schritte.push('Offene Angebote nachfassen oder senden')
  if (auftraege.length) schritte.push('Aufträge: Status / Vor Ort prüfen')
  if (!schritte.length) schritte.push('Keine kritischen offenen Punkte — Pipeline pflegen')

  const links: Array<{ href: string; label: string; hint?: string }> = []
  for (const a of anfragen.slice(0, 3) as Array<{ id: string; kontakt_name?: string | null }>) {
    links.push({
      href: `/anfragen/${a.id}`,
      label: `Anfrage · ${a.kontakt_name || a.id.slice(0, 8)}`,
      hint: 'Lead prüfen',
    })
  }
  for (const t of todoList.slice(0, 3) as Array<{ id: string; titel: string; ueberfaellig?: boolean }>) {
    links.push({
      href: `/kalender`,
      label: `To-do · ${t.titel}`,
      hint: t.ueberfaellig ? 'Überfällig' : 'Wichtig',
    })
  }
  for (const r of ueberfaellig.slice(0, 3)) {
    links.push({
      href: `/rechnungen/${r.id}`,
      label: `Rechnung · ${r.rechnungsnummer || r.id.slice(0, 8)}`,
      hint: 'Mahnung?',
    })
  }
  for (const o of (angebote as Array<{ id: string; angebotsnr?: string | null }>).slice(0, 2)) {
    links.push({
      href: `/angebote/${o.id}`,
      label: `Angebot · ${o.angebotsnr || o.id.slice(0, 8)}`,
    })
  }

  return {
    datum: heute,
    fokus,
    empfohlene_reihenfolge: schritte,
    zahlen: {
      neue_anfragen: anfragen.length,
      termine_heute: termine.length,
      wichtige_todos: todoList.length,
      offene_rechnungen: rechnungen.length,
      ueberfaellig: ueberfaellig.length,
      offene_angebote: angebote.length,
      aktive_auftraege: auftraege.length,
    },
    wichtige_todos: todoList.slice(0, 8),
    links,
    tipp: 'Flows: „Angebot aus Anfrage X“ · „Handwerker vorschlagen“ · „Rechnung aus Auftrag“ · list_todos.',
  }
}
