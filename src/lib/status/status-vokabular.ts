/**
 * Status-Vokabular (P2-2 / E4): DB-Wert → Anzeige-Labels.
 *
 * Kanonische Phasen-Maps leben in `status-map.ts` — hier re-exportiert und um
 * Partner-Zuweisungen sowie CRM-/Portal-Spalten ergänzt.
 *
 * E5: Anzeige „Partner“ (nicht Handwerker) in Rollentexten.
 * E6: Annahme-UI immer „Angenommen“ (DB-Werte wie akzeptiert bleiben).
 */

export {
  ANFRAGE_STATUS_MAP,
  ANGEBOT_STATUS_MAP,
  AUFTRAG_STATUS_MAP,
  RECHNUNG_STATUS_MAP,
  PHASE_UNTERSTATUS_VALUES,
  statusLabel,
  statusShortLabel,
  statusMapEntry,
  statusMapEntryOrUnknown,
  unterstatusLabelFromMap,
  unknownStatusEntry,
  type StatusMapEntry,
  type VorgangPhaseKey,
} from './status-map'

import {
  ANFRAGE_STATUS_MAP,
  ANGEBOT_STATUS_MAP,
  AUFTRAG_STATUS_MAP,
  RECHNUNG_STATUS_MAP,
  type StatusMapEntry,
  type VorgangPhaseKey,
} from './status-map'

/** Eine Vokabel: DB-Schlüssel + Labels für CRM und Portal (meist identisch). */
export type StatusVokabel = {
  db: string
  crmLabel: string
  portalLabel: string
  shortLabel?: string
}

function vokabelFromEntry(db: string, entry: StatusMapEntry): StatusVokabel {
  return {
    db,
    crmLabel: entry.label,
    portalLabel: entry.label,
    shortLabel: entry.shortLabel,
  }
}

function mapToVokabular(map: Record<string, StatusMapEntry>): StatusVokabel[] {
  return Object.entries(map).map(([db, entry]) => vokabelFromEntry(db, entry))
}

/** Lead / Anfrage */
export const LEAD_STATUS_VOKABULAR: StatusVokabel[] = mapToVokabular(ANFRAGE_STATUS_MAP)

/** Angebot (Fein- + Einfach-Status) */
export const ANGEBOT_STATUS_VOKABULAR: StatusVokabel[] = mapToVokabular(ANGEBOT_STATUS_MAP)

/** Auftrag */
export const AUFTRAG_STATUS_VOKABULAR: StatusVokabel[] = mapToVokabular(AUFTRAG_STATUS_MAP)

/** Rechnung */
export const RECHNUNG_STATUS_VOKABULAR: StatusVokabel[] = mapToVokabular(RECHNUNG_STATUS_MAP)

/**
 * Partner-Zuweisung (auftrag_handwerker / angebot_handwerker.status).
 * DB darf „akzeptiert“ bleiben — UI: „Angenommen“ (E6).
 */
export const PARTNER_STATUS_VOKABULAR: StatusVokabel[] = [
  { db: 'ausstehend', crmLabel: 'Ausstehend', portalLabel: 'Ausstehend' },
  { db: 'angefragt', crmLabel: 'Angeschrieben', portalLabel: 'Angefragt' },
  { db: 'warten', crmLabel: 'Warten auf Antwort', portalLabel: 'Warten auf Antwort' },
  { db: 'akzeptiert', crmLabel: 'Angenommen', portalLabel: 'Angenommen' },
  { db: 'angenommen', crmLabel: 'Angenommen', portalLabel: 'Angenommen' },
  { db: 'bestaetigt', crmLabel: 'Angenommen', portalLabel: 'Angenommen' },
  { db: 'abgelehnt', crmLabel: 'Abgelehnt', portalLabel: 'Abgelehnt' },
  { db: 'zugewiesen', crmLabel: 'Zugewiesen', portalLabel: 'Zugewiesen' },
  { db: 'ersetzt', crmLabel: 'Ersetzt', portalLabel: 'Ersetzt' },
  { db: 'erledigt', crmLabel: 'Erledigt', portalLabel: 'Erledigt' },
]

/** Partner-Einreichung (hw_status) */
export const PARTNER_EINREICHUNG_VOKABULAR: StatusVokabel[] = [
  { db: 'offen', crmLabel: 'Offen', portalLabel: 'Offen' },
  { db: 'eingereicht', crmLabel: 'Eingereicht', portalLabel: 'Eingereicht' },
  { db: 'bestaetigt', crmLabel: 'Warte auf Partner-Bestätigung', portalLabel: 'Warte auf Bestätigung' },
  { db: 'uebernommen', crmLabel: 'Übernommen', portalLabel: 'Übernommen' },
  { db: 'abgelehnt', crmLabel: 'Abgelehnt', portalLabel: 'Abgelehnt' },
  { db: 'rueckfrage', crmLabel: 'Rückfrage', portalLabel: 'Rückfrage' },
]

/** Abnahmeprotokoll-Ergebnis (PDF + Wizard) — kanonisch hier. */
export const ABNAHME_ERGEBNIS_LABEL = {
  abgenommen: 'Die Leistungen werden abgenommen',
  mit_vorbehalt: 'Die Leistungen werden unter Vorbehalt abgenommen',
  verweigert: 'Die Abnahme wird verweigert',
} as const

export type AbnahmeErgebnisKey = keyof typeof ABNAHME_ERGEBNIS_LABEL

export type StatusDomain =
  | 'lead'
  | 'angebot'
  | 'auftrag'
  | 'rechnung'
  | 'partner'
  | 'partner_einreichung'

const DOMAIN_LISTS: Record<StatusDomain, StatusVokabel[]> = {
  lead: LEAD_STATUS_VOKABULAR,
  angebot: ANGEBOT_STATUS_VOKABULAR,
  auftrag: AUFTRAG_STATUS_VOKABULAR,
  rechnung: RECHNUNG_STATUS_VOKABULAR,
  partner: PARTNER_STATUS_VOKABULAR,
  partner_einreichung: PARTNER_EINREICHUNG_VOKABULAR,
}

export function statusVokabel(
  domain: StatusDomain,
  dbValue: string | null | undefined
): StatusVokabel | null {
  const key = String(dbValue ?? '')
    .trim()
    .toLowerCase()
  if (!key) return null
  return DOMAIN_LISTS[domain].find((v) => v.db === key) ?? null
}

/** CRM-Anzeige-Label; Fallback = Rohwert oder „Unbekannt“. */
export function statusCrmLabel(
  domain: StatusDomain,
  dbValue: string | null | undefined
): string {
  const v = statusVokabel(domain, dbValue)
  if (v) return v.crmLabel
  const raw = String(dbValue ?? '').trim()
  return raw || 'Unbekannt'
}

/** Portal-Anzeige-Label; Fallback = CRM-Logik. */
export function statusPortalLabel(
  domain: StatusDomain,
  dbValue: string | null | undefined
): string {
  const v = statusVokabel(domain, dbValue)
  if (v) return v.portalLabel
  return statusCrmLabel(domain, dbValue)
}

/** Phasen-Domain → status-map Lookup (Kompatibilität). */
export function phaseDomain(phase: VorgangPhaseKey): StatusDomain {
  if (phase === 'anfrage') return 'lead'
  return phase
}
