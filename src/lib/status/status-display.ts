import {
  ANGEBOT_EINFACH_LABELS,
  resolveStatusEinfach,
  type AngebotStatusEinfach,
  type AngebotStatusEinfachRow,
} from '@/lib/angebot-einfach'
import type { AuftragStatus, LeadStatus, OrgFreigabeStatus } from '@/lib/types'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { AUFTRAG_STATUS_LABELS, STATUS_LABELS, formatDatum } from '@/lib/utils'
import type { StatusDisplayVariant } from '@/lib/status/mock-badge-kind'

export type StatusDisplay = {
  label: string
  variant: StatusDisplayVariant
}

const ANGEBOT_VARIANT: Record<AngebotStatusEinfach, StatusDisplayVariant> = {
  entwurf: 'neutral',
  gesendet: 'active',
  angenommen: 'success',
  abgelehnt: 'danger',
  abgelaufen: 'warning',
  ersetzt: 'neutral',
}

const ANFRAGE_VARIANT: Record<LeadStatus, StatusDisplayVariant> = {
  neu: 'active',
  kontaktiert: 'warning',
  termin: 'warning',
  angebot: 'active',
  auftrag: 'success',
  abgeschlossen: 'success',
  abgebrochen: 'danger',
}

const AUFTRAG_VARIANT: Record<AuftragStatus, StatusDisplayVariant> = {
  offen: 'neutral',
  in_arbeit: 'active',
  abnahme: 'warning',
  abgeschlossen: 'success',
  storniert: 'danger',
}

const RECHNUNG_VARIANT: Record<RechnungStatus, StatusDisplayVariant> = {
  entwurf: 'neutral',
  gesendet: 'active',
  bezahlt: 'success',
  storniert: 'danger',
}

/** Mieter-Meldung wartet auf HV-Freigabe (kein Notfall / über Schwelle) — bleibt unter Offen. */
export const ANFRAGE_WARTE_AUF_HV_LABEL = 'Warte auf Hausverwaltung'

const ANFRAGE_GESCHLOSSEN = new Set(['abgebrochen', 'abgeschlossen', 'auftrag'])

/** Nutzer-sichtbares Label + semantische Farbe für Anfrage (Lead). */
export function anfrageStatusDisplay(
  status: LeadStatus | string,
  opts?: { orgFreigabeStatus?: OrgFreigabeStatus | string | null }
): StatusDisplay {
  const key = status as LeadStatus
  const freigabe = (opts?.orgFreigabeStatus ?? '').trim()
  if (freigabe === 'ausstehend' && !ANFRAGE_GESCHLOSSEN.has(key)) {
    return { label: ANFRAGE_WARTE_AUF_HV_LABEL, variant: 'warning' }
  }
  const label = key in STATUS_LABELS ? STATUS_LABELS[key] : String(status)
  const variant = key in ANFRAGE_VARIANT ? ANFRAGE_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** Nutzer-sichtbares Label + semantische Farbe für Angebot (`status_einfach`). */
export function angebotStatusDisplay(row: AngebotStatusEinfachRow): StatusDisplay {
  const einfach = resolveStatusEinfach(row)
  return {
    label: ANGEBOT_EINFACH_LABELS[einfach],
    variant: ANGEBOT_VARIANT[einfach],
  }
}

/** Nutzer-sichtbares Label + semantische Farbe für Auftrag. */
export function auftragStatusDisplay(status: AuftragStatus | string): StatusDisplay {
  const key = status as AuftragStatus
  const label =
    key in AUFTRAG_STATUS_LABELS ? AUFTRAG_STATUS_LABELS[key] : String(status)
  const variant =
    key in AUFTRAG_VARIANT ? AUFTRAG_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** Nutzer-sichtbares Label + semantische Farbe für Rechnung. */
export function rechnungStatusDisplay(
  status: RechnungStatus | string,
  opts?: { ueberfaellig?: boolean }
): StatusDisplay {
  if (opts?.ueberfaellig) {
    return { label: 'Überfällig', variant: 'warning' }
  }
  const key = status as RechnungStatus
  const label =
    key in RECHNUNG_STATUS_LABELS ? RECHNUNG_STATUS_LABELS[key] : String(status)
  const variant = key in RECHNUNG_VARIANT ? RECHNUNG_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** Dezente Kopf-Zeile unter Titel bei Versand (gesendet_am / versendet_am / Fallback). */
export function gesendetDetailSubline(
  sentAt: string | null | undefined,
  fallbackAt?: string | null | undefined
): string {
  const raw = (sentAt ?? fallbackAt ?? '').trim()
  if (!raw) return 'Gesendet'
  return `Gesendet · ${formatDatum(raw)}`
}

/** Sekundär-Badge: Bauprojekt vs. Standardauftrag (nur Typ-Hinweis, kein Workflow-Status). */
export function auftragTypDisplay(istBauprojekt: boolean): StatusDisplay {
  return istBauprojekt
    ? { label: 'Bauprojekt', variant: 'warning' }
    : { label: 'Standardauftrag', variant: 'neutral' }
}
