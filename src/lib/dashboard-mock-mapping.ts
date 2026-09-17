/**
 * Dashboard: Kind/Tone + KPI-Helfer.
 * Labels kommen ausschließlich aus der kanonischen Status-Map (`status-map.ts`).
 * Keine eigenen Wortlaute („Fertig“, „Versendet“, „Gesendet HW“, …).
 */

import { istUeberfaelligYmd } from '@/lib/dates/werktag'
import {
  statusLabel,
  statusShortLabel,
} from '@/lib/status/status-map'

export type DashboardBadge = { kind: string; label: string }

const LEAD_KIND: Record<string, string> = {
  neu: 'neu',
  kontaktiert: 'neu',
  termin: 'aktiv',
  angebot: 'warten',
  auftrag: 'aktiv',
  abgeschlossen: 'fertig',
  abgebrochen: 'storniert',
}

const ANGEBOT_KIND: Record<string, string> = {
  entwurf: 'fertig',
  gesendet_handwerker: 'neu',
  gesendet_hw: 'neu',
  handwerker_akzeptiert: 'fertig',
  hw_akzeptiert: 'fertig',
  gesendet_kunde: 'warten',
  kunde_akzeptiert: 'aktiv',
  abgelehnt: 'storniert',
  gesendet: 'warten',
  angenommen: 'aktiv',
}

const AUFTRAG_KIND: Record<string, string> = {
  offen: 'aktiv',
  in_arbeit: 'aktiv',
  abnahme: 'warten',
  abgeschlossen: 'fertig',
  storniert: 'storniert',
}

export function leadDashboardBadge(status: string | null | undefined): DashboardBadge {
  const key = String(status ?? '').toLowerCase()
  return {
    kind: LEAD_KIND[key] ?? 'plain',
    label: key ? statusLabel('anfrage', key) : '—',
  }
}

export function angebotDashboardBadge(
  status: string | null | undefined,
  statusEinfach?: string | null
): DashboardBadge {
  const fine = String(status ?? '').toLowerCase()
  const einfach = String(statusEinfach ?? '').toLowerCase()
  const key = fine || einfach
  const mapKey =
    key === 'gesendet_hw'
      ? 'gesendet_handwerker'
      : key === 'hw_akzeptiert'
        ? 'handwerker_akzeptiert'
        : key
  return {
    kind: ANGEBOT_KIND[key] ?? ANGEBOT_KIND[einfach] ?? 'plain',
    label: mapKey
      ? statusShortLabel('angebot', mapKey)
      : status || statusEinfach || '—',
  }
}

export function auftragDashboardBadge(status: string | null | undefined): DashboardBadge {
  const key = String(status ?? '').toLowerCase()
  return {
    kind: AUFTRAG_KIND[key] ?? 'plain',
    label: key ? statusLabel('auftrag', key) : '—',
  }
}

export function rechnungDashboardBadge(input: {
  status: string | null | undefined
  faellig_am?: string | null
}): DashboardBadge {
  const st = String(input.status ?? '').toLowerCase()
  if (st === 'bezahlt') {
    return { kind: 'aktiv', label: statusLabel('rechnung', 'bezahlt') }
  }
  if (st === 'storniert') {
    return { kind: 'storniert', label: statusLabel('rechnung', 'storniert') }
  }
  if (st === 'entwurf') {
    return { kind: 'fertig', label: statusLabel('rechnung', 'entwurf') }
  }
  if (st === 'gesendet') {
    if (istUeberfaelligYmd(input.faellig_am)) {
      return { kind: 'storniert', label: statusLabel('rechnung', 'ueberfaellig') }
    }
    return { kind: 'warten', label: statusLabel('rechnung', 'gesendet') }
  }
  return { kind: 'plain', label: input.status || '—' }
}

/** KPI: Offene Anfragen = Status neu/kontaktiert/termin, ohne Soft-Delete, ohne verknüpftes Angebot. */
export function isOffeneAnfrageStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase()
  return s === 'neu' || s === 'kontaktiert' || s === 'termin'
}

/** @deprecated Alias — nutze isOffeneAnfrageStatus */
export function isNeueAnfrageStatus(status: string | null | undefined): boolean {
  return isOffeneAnfrageStatus(status)
}

/** KPI: Offene Angebote = nicht angenommen/abgelehnt */
export function isOffenesAngebotStatus(
  status: string | null | undefined,
  statusEinfach?: string | null
): boolean {
  const fine = String(status ?? '').toLowerCase()
  const einfach = String(statusEinfach ?? '').toLowerCase()
  if (fine === 'kunde_akzeptiert' || fine === 'abgelehnt') return false
  if (einfach === 'angenommen' || einfach === 'abgelehnt') return false
  return true
}

export function isAktiverAuftragStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase()
  return s === 'offen' || s === 'in_arbeit' || s === 'abnahme'
}

/** Angebot vom Kunden angenommen (Funnel-Stufe „Angebot“). */
export function isAngenommenesAngebotStatus(
  status: string | null | undefined,
  statusEinfach?: string | null
): boolean {
  const fine = String(status ?? '').toLowerCase()
  const einfach = String(statusEinfach ?? '').toLowerCase()
  return (
    fine === 'kunde_akzeptiert' ||
    fine === 'angenommen' ||
    einfach === 'angenommen'
  )
}

/** Auftrag zählt im Vertriebs-Funnel: aktiv oder abgeschlossen (ohne Storno). */
export function isFunnelAuftragStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase()
  return s === 'offen' || s === 'in_arbeit' || s === 'abnahme' || s === 'abgeschlossen'
}

/** KPI: Offene Rechnungen = gestellt/offen (gesendet; Überfällig ist Untermenge) */
export function isOffeneRechnungStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase()
  return s === 'gesendet'
}

/** Gesendet + Fälligkeit überschritten (My Work / KPI). */
export function isUeberfaelligeRechnung(input: {
  status: string | null | undefined
  faellig_am?: string | null
}): boolean {
  const st = String(input.status ?? '').toLowerCase()
  if (st !== 'gesendet') return false
  return istUeberfaelligYmd(input.faellig_am)
}

/** Angebot beim Kunden — keine Annahme/Ablehnung (W2-02). */
export function isAngebotWartetAufKundeStatus(
  status: string | null | undefined,
  statusEinfach?: string | null
): boolean {
  const fine = String(status ?? '').toLowerCase()
  if (fine === 'gesendet_kunde' || fine === 'gesendet') return true
  const einfach = String(statusEinfach ?? '').toLowerCase()
  return einfach === 'gesendet'
}
