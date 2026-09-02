import {
  ANGEBOT_EINFACH_LABELS,
  resolveStatusEinfach,
  type AngebotStatusEinfach,
  type AngebotStatusEinfachRow,
} from '@/lib/angebot-einfach'
import type { AuftragStatus, LeadStatus, OrgFreigabeStatus } from '@/lib/types'
import { type RechnungStatus } from '@/lib/rechnung-config'
import { resolveRechnungKorrekturUi } from '@/lib/rechnungen/rechnung-korrektur'
import {
  statusLabel,
  statusMapEntry,
  unknownStatusEntry,
} from '@/lib/status/status-map'
import { formatDatum } from '@/lib/utils'
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

/** @deprecated Kein eigener Vorgangs-Status mehr — Angebot zeigt „Gesendet“. */
export const ANFRAGE_WARTE_AUF_HV_LABEL = 'Gesendet'

/** Nutzer-sichtbares Label + semantische Farbe für Anfrage (Lead). */
export function anfrageStatusDisplay(
  status: LeadStatus | string,
  opts?: {
    orgFreigabeStatus?: OrgFreigabeStatus | string | null
    hvMeldungStatus?: string | null
  }
): StatusDisplay {
  const hv = String(opts?.hvMeldungStatus ?? '')
    .trim()
    .toLowerCase()
  if (hv === 'hm_erledigt') {
    return { label: 'Vom Hausmeister erledigt', variant: 'success' }
  }
  void opts?.orgFreigabeStatus
  const key = String(status ?? '')
    .trim()
    .toLowerCase() as LeadStatus
  const known = statusMapEntry('anfrage', key)
  const label = known?.label ?? unknownStatusEntry(status).label
  const variant = key in ANFRAGE_VARIANT ? ANFRAGE_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** Nutzer-sichtbares Label + semantische Farbe für Angebot (`status_einfach`). */
export function angebotStatusDisplay(row: AngebotStatusEinfachRow): StatusDisplay {
  const db = String(row.status ?? '')
    .trim()
    .toLowerCase()
  const einfachCol = String(row.status_einfach ?? '')
    .trim()
    .toLowerCase()
  /* Fein-Status vor Einfach-Collapse: sonst bleibt Badge bei „Gesendet“/blau */
  if (db === 'handwerker_akzeptiert') {
    return { label: statusLabel('angebot', 'handwerker_akzeptiert'), variant: 'success' }
  }
  if (db === 'gesendet_handwerker') {
    return { label: statusLabel('angebot', 'gesendet_handwerker'), variant: 'active' }
  }
  /* Alt-Status (z. B. versendet): nicht zu „Entwurf“ kollabieren — Rohwert, neutral */
  const einfachKnown =
    einfachCol === 'entwurf' ||
    einfachCol === 'gesendet' ||
    einfachCol === 'angenommen' ||
    einfachCol === 'abgelehnt' ||
    einfachCol === 'abgelaufen' ||
    einfachCol === 'ersetzt'
  if (einfachCol && !einfachKnown && !statusMapEntry('angebot', einfachCol)) {
    return { label: unknownStatusEntry(einfachCol).label, variant: 'neutral' }
  }
  if (!einfachCol && db && !statusMapEntry('angebot', db)) {
    return { label: unknownStatusEntry(db).label, variant: 'neutral' }
  }
  const einfach = resolveStatusEinfach(row)
  return {
    label: ANGEBOT_EINFACH_LABELS[einfach],
    variant: ANGEBOT_VARIANT[einfach],
  }
}

/** Nutzer-sichtbares Label + semantische Farbe für Auftrag. */
export function auftragStatusDisplay(status: AuftragStatus | string): StatusDisplay {
  const key = String(status ?? '')
    .trim()
    .toLowerCase() as AuftragStatus
  const known = statusMapEntry('auftrag', key)
  const label = known?.label ?? unknownStatusEntry(status).label
  const variant = key in AUFTRAG_VARIANT ? AUFTRAG_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** Nutzer-sichtbares Label + semantische Farbe für Rechnung. */
export function rechnungStatusDisplay(
  status: RechnungStatus | string,
  opts?: {
    ueberfaellig?: boolean
    eingehend?: boolean
    korrektur_von?: string | null
    korrektur_art?: string | null
  }
): StatusDisplay {
  if (opts?.ueberfaellig) {
    return { label: statusLabel('rechnung', 'ueberfaellig'), variant: 'warning' }
  }
  if (opts?.korrektur_von) {
    const ui = resolveRechnungKorrekturUi({
      status,
      korrektur_von: opts.korrektur_von,
      korrektur_art: opts.korrektur_art,
    })
    if (ui.dualBadges) {
      return { label: ui.dualBadges.secondary, variant: 'neutral' }
    }
  }
  const key = String(status ?? '')
    .trim()
    .toLowerCase() as RechnungStatus
  if (opts?.eingehend && key === 'bezahlt') {
    return { label: statusLabel('rechnung', 'ueberwiesen'), variant: 'success' }
  }
  const known = statusMapEntry('rechnung', key)
  const label = known?.label ?? unknownStatusEntry(status).label
  const variant = key in RECHNUNG_VARIANT ? RECHNUNG_VARIANT[key] : 'neutral'
  return { label, variant }
}

/** True wenn Inhalt nach dem Kundenversand erneut gespeichert wurde (ohne erneuten Versand). */
export function angebotInhaltGeaendertNachVersand(
  sentAt: string | null | undefined,
  updatedAt: string | null | undefined
): boolean {
  const sent = (sentAt ?? '').trim()
  const upd = (updatedAt ?? '').trim()
  if (!sent || !upd) return false
  const sentMs = Date.parse(sent)
  const updMs = Date.parse(upd)
  if (!Number.isFinite(sentMs) || !Number.isFinite(updMs)) return false
  // Versand setzt oft beide Timestamps fast gleich — 90s Puffer
  return updMs - sentMs > 90_000
}

/** Dezente Kopf-Zeile unter Titel bei Versand (gesendet_am / versendet_am / Fallback). */
export function gesendetDetailSubline(
  sentAt: string | null | undefined,
  fallbackAt?: string | null | undefined,
  opts?: { inhaltGeaendert?: boolean }
): string {
  const raw = (sentAt ?? fallbackAt ?? '').trim()
  const base = !raw ? 'Gesendet' : `Gesendet · ${formatDatum(raw)}`
  if (opts?.inhaltGeaendert) {
    return `${base} · geändert — noch nicht erneut versendet`
  }
  return base
}

/** Sekundär-Badge: Bauprojekt vs. Standardauftrag (nur Typ-Hinweis, kein Workflow-Status). */
export function auftragTypDisplay(istBauprojekt: boolean): StatusDisplay {
  return istBauprojekt
    ? { label: 'Bauprojekt', variant: 'warning' }
    : { label: 'Standardauftrag', variant: 'neutral' }
}
