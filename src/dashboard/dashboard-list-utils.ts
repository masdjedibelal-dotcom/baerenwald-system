import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { LeadWithAngebote } from '@/lib/types'

/** Einträge pro Seite in Dashboard-Listen-Cards auf der Startseite. */
export const DASHBOARD_LIST_PAGE_SIZE = 8

/** Sichtbare Zeilen im Scroll-Bereich pro Seite (Rest per Scroll in der Card). */
export const DASHBOARD_LIST_VISIBLE_ROWS = 5

export function leadNameSort(l: LeadWithAngebote) {
  return leadKontaktAnzeigeName(l, '')
}
