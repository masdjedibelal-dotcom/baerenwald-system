import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { AngebotListeEintrag, LeadWithAngebote } from '@/lib/types'

/** Einträge pro Seite in Dashboard-Listen-Cards auf der Startseite. */
export const DASHBOARD_LIST_PAGE_SIZE = 8

/** Sichtbare Zeilen im Scroll-Bereich pro Seite (Rest per Scroll in der Card). */
export const DASHBOARD_LIST_VISIBLE_ROWS = 5

export function leadNameSort(l: LeadWithAngebote) {
  return leadKontaktAnzeigeName(l, '')
}

export function angebotSubline(a: AngebotListeEintrag) {
  const projekt = a.leads?.situation?.trim()
  const plz = a.leads?.plz?.trim() || a.kunden?.plz?.trim() || '—'
  return projekt ? `${projekt} · ${plz}` : plz
}

export function angebotKundenName(a: AngebotListeEintrag) {
  const k = a.kunden
  if (k && typeof k === 'object' && 'name' in k && k.name) return String(k.name)
  return 'Ohne Kunde'
}
