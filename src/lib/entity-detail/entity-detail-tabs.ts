/** Spec §3 — einheitliche Detail-Tabs (Anzeige-Labels). */

import {
  ACTIVITY_TAB_LABEL,
  PROJEKT_PHASEN_TAB_LABEL,
} from '@/lib/crm-labels'
import {
  CUMULATIVE_DETAIL_LABEL,
  CUMULATIVE_DETAIL_TAB,
} from '@/lib/entity-detail/cumulative-detail-tabs'

export const ENTITY_DETAIL_TAB_LABELS = {
  stammdaten: 'Kunde & Objekt',
  details: 'Positionen',
  bedarf: 'Bedarf',
  projektinfos: 'Projektinfos',
  verlauf: ACTIVITY_TAB_LABEL,
  historie: PROJEKT_PHASEN_TAB_LABEL,
  projektphasen: PROJEKT_PHASEN_TAB_LABEL,
  dokumente: 'Dokumente',
  notizen: 'Notizen',
  uebersicht: 'Übersicht',
  zahlplan: 'Zahlung',
  vorOrt: 'Vor Ort',
  bautagebuch: 'Bautagebuch',
  akte: 'Akte',
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
    bedarf: ENTITY_DETAIL_TAB_LABELS.bedarf,
    projektinfos: ENTITY_DETAIL_TAB_LABELS.projektinfos,
    projekt: ENTITY_DETAIL_TAB_LABELS.details,
    details: ENTITY_DETAIL_TAB_LABELS.details,
    schritte: ENTITY_DETAIL_TAB_LABELS.schritte,
    timeline: ENTITY_DETAIL_TAB_LABELS.verlauf,
    verlauf: ENTITY_DETAIL_TAB_LABELS.verlauf,
    aktivitaet: ENTITY_DETAIL_TAB_LABELS.aktivitaet,
    historie: ENTITY_DETAIL_TAB_LABELS.historie,
    projektphasen: ENTITY_DETAIL_TAB_LABELS.projektphasen,
    'projekt-historie': ENTITY_DETAIL_TAB_LABELS.projektphasen,
    phasen: ENTITY_DETAIL_TAB_LABELS.projektphasen,
    dokumente: ENTITY_DETAIL_TAB_LABELS.dokumente,
    notizen: ENTITY_DETAIL_TAB_LABELS.notizen,
    leistung: ENTITY_DETAIL_TAB_LABELS.leistung,
    positionen: ENTITY_DETAIL_TAB_LABELS.positionen,
    uebersicht: ENTITY_DETAIL_TAB_LABELS.uebersicht,
    auftragdetails: ENTITY_DETAIL_TAB_LABELS.uebersicht,
    finanzen: ENTITY_DETAIL_TAB_LABELS.zahlplan,
    zahlplan: ENTITY_DETAIL_TAB_LABELS.zahlplan,
    akte: ENTITY_DETAIL_TAB_LABELS.akte,
    ausfuehrung: ENTITY_DETAIL_TAB_LABELS.vorOrt,
    vorOrt: ENTITY_DETAIL_TAB_LABELS.vorOrt,
    'vor-ort': ENTITY_DETAIL_TAB_LABELS.vorOrt,
    bautagebuch: ENTITY_DETAIL_TAB_LABELS.bautagebuch,
    [CUMULATIVE_DETAIL_TAB.anfrage]: CUMULATIVE_DETAIL_LABEL.anfrage,
    [CUMULATIVE_DETAIL_TAB.angebot]: CUMULATIVE_DETAIL_LABEL.angebot,
    [CUMULATIVE_DETAIL_TAB.auftrag]: CUMULATIVE_DETAIL_LABEL.auftrag,
    [CUMULATIVE_DETAIL_TAB.rechnung]: CUMULATIVE_DETAIL_LABEL.rechnung,
  }
  return map[tabId] ?? tabId
}
