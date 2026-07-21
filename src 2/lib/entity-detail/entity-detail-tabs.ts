/** Spec §3 — einheitliche Detail-Tabs (Anzeige-Labels). */

import {
  CUMULATIVE_DETAIL_LABEL,
  CUMULATIVE_DETAIL_TAB,
} from '@/lib/entity-detail/cumulative-detail-tabs'

export const ENTITY_DETAIL_TAB_LABELS = {
  stammdaten: 'Stammdaten',
  details: 'Details',
  verlauf: 'Verlauf',
  dokumente: 'Dokumente',
  notizen: 'Notizen',
  uebersicht: 'Übersicht',
  zahlplan: 'Zahlung & Rechnung',
  bautagebuch: 'Bautagebuch',
  schritte: 'Nächste Schritte',
  leistung: 'Leistungen',
  positionen: 'Positionen',
  aktivitaet: 'Aktivität',
  [CUMULATIVE_DETAIL_TAB.anfrage]: CUMULATIVE_DETAIL_LABEL.anfrage,
  [CUMULATIVE_DETAIL_TAB.angebot]: CUMULATIVE_DETAIL_LABEL.angebot,
  [CUMULATIVE_DETAIL_TAB.auftrag]: CUMULATIVE_DETAIL_LABEL.auftrag,
  [CUMULATIVE_DETAIL_TAB.rechnung]: CUMULATIVE_DETAIL_LABEL.rechnung,
} as const

/** Legacy-Tab-ID → Spec-Label (Wave 1: nur Label-Mapping, keine ID-Umbenennung). */
export function entityDetailTabLabel(tabId: string): string {
  const map: Record<string, string> = {
    stammdaten: ENTITY_DETAIL_TAB_LABELS.stammdaten,
    projekt: ENTITY_DETAIL_TAB_LABELS.details,
    details: ENTITY_DETAIL_TAB_LABELS.details,
    schritte: ENTITY_DETAIL_TAB_LABELS.schritte,
    timeline: ENTITY_DETAIL_TAB_LABELS.verlauf,
    verlauf: ENTITY_DETAIL_TAB_LABELS.verlauf,
    aktivitaet: ENTITY_DETAIL_TAB_LABELS.aktivitaet,
    dokumente: ENTITY_DETAIL_TAB_LABELS.dokumente,
    notizen: ENTITY_DETAIL_TAB_LABELS.notizen,
    leistung: ENTITY_DETAIL_TAB_LABELS.leistung,
    positionen: ENTITY_DETAIL_TAB_LABELS.positionen,
    uebersicht: ENTITY_DETAIL_TAB_LABELS.uebersicht,
    zahlplan: ENTITY_DETAIL_TAB_LABELS.zahlplan,
    bautagebuch: ENTITY_DETAIL_TAB_LABELS.bautagebuch,
    [CUMULATIVE_DETAIL_TAB.anfrage]: CUMULATIVE_DETAIL_LABEL.anfrage,
    [CUMULATIVE_DETAIL_TAB.angebot]: CUMULATIVE_DETAIL_LABEL.angebot,
    [CUMULATIVE_DETAIL_TAB.auftrag]: CUMULATIVE_DETAIL_LABEL.auftrag,
    [CUMULATIVE_DETAIL_TAB.rechnung]: CUMULATIVE_DETAIL_LABEL.rechnung,
  }
  return map[tabId] ?? tabId
}
