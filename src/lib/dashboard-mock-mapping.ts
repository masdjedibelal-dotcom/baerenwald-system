/** Dashboard-Badge-/KPI-Mapping 1:1 Mock-Wortlaut → CRM-Status */

export type DashboardBadge = { kind: string; label: string }

const LEAD_BADGE: Record<string, DashboardBadge> = {
  neu: { kind: 'neu', label: 'Neu' },
  kontaktiert: { kind: 'neu', label: 'Kontaktiert' },
  termin: { kind: 'aktiv', label: 'Termin' },
  angebot: { kind: 'warten', label: 'Angebot' },
  auftrag: { kind: 'aktiv', label: 'Auftrag' },
  abgeschlossen: { kind: 'fertig', label: 'Abgeschlossen' },
  abgebrochen: { kind: 'storniert', label: 'Abgebrochen' },
}

/** Mock-Wortlaut (nicht CRM-Langform „Handwerker akzeptiert“) */
const ANGEBOT_BADGE: Record<string, DashboardBadge> = {
  entwurf: { kind: 'fertig', label: 'Entwurf' },
  gesendet_handwerker: { kind: 'neu', label: 'Gesendet HW' },
  gesendet_hw: { kind: 'neu', label: 'Gesendet HW' },
  handwerker_akzeptiert: { kind: 'aktiv', label: 'HW akzeptiert' },
  hw_akzeptiert: { kind: 'aktiv', label: 'HW akzeptiert' },
  gesendet_kunde: { kind: 'warten', label: 'Gesendet Kunde' },
  kunde_akzeptiert: { kind: 'aktiv', label: 'Kunde akzeptiert' },
  abgelehnt: { kind: 'storniert', label: 'Abgelehnt' },
  // status_einfach fallbacks
  gesendet: { kind: 'warten', label: 'Gesendet Kunde' },
  angenommen: { kind: 'aktiv', label: 'Kunde akzeptiert' },
}

const AUFTRAG_BADGE: Record<string, DashboardBadge> = {
  offen: { kind: 'aktiv', label: 'In Arbeit' },
  in_arbeit: { kind: 'aktiv', label: 'In Arbeit' },
  abnahme: { kind: 'warten', label: 'Abnahme' },
  abgeschlossen: { kind: 'fertig', label: 'Fertig' },
  storniert: { kind: 'storniert', label: 'Storniert' },
}

export function leadDashboardBadge(status: string | null | undefined): DashboardBadge {
  const key = String(status ?? '').toLowerCase()
  return LEAD_BADGE[key] ?? { kind: 'plain', label: status || '—' }
}

export function angebotDashboardBadge(
  status: string | null | undefined,
  statusEinfach?: string | null
): DashboardBadge {
  const fine = String(status ?? '').toLowerCase()
  if (ANGEBOT_BADGE[fine]) return ANGEBOT_BADGE[fine]!
  const einfach = String(statusEinfach ?? '').toLowerCase()
  return ANGEBOT_BADGE[einfach] ?? { kind: 'plain', label: status || statusEinfach || '—' }
}

export function auftragDashboardBadge(status: string | null | undefined): DashboardBadge {
  const key = String(status ?? '').toLowerCase()
  return AUFTRAG_BADGE[key] ?? { kind: 'plain', label: status || '—' }
}

export function rechnungDashboardBadge(input: {
  status: string | null | undefined
  faellig_am?: string | null
}): DashboardBadge {
  const st = String(input.status ?? '').toLowerCase()
  if (st === 'bezahlt') return { kind: 'aktiv', label: 'Bezahlt' }
  if (st === 'storniert') return { kind: 'storniert', label: 'Storniert' }
  if (st === 'entwurf') return { kind: 'fertig', label: 'Entwurf' }
  // gestellt/gesendet → Mock „Versendet“; Überfällig wenn Fälligkeit überschritten
  if (st === 'gesendet') {
    const f = input.faellig_am?.slice(0, 10)
    const heute = new Date().toISOString().slice(0, 10)
    if (f && f < heute) return { kind: 'storniert', label: 'Überfällig' }
    return { kind: 'warten', label: 'Versendet' }
  }
  return { kind: 'plain', label: input.status || '—' }
}

/** KPI: Neue Anfragen = Phase Anfrage offen (neu|kontaktiert) */
export function isNeueAnfrageStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase()
  return s === 'neu' || s === 'kontaktiert'
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
  const f = input.faellig_am?.slice(0, 10)
  if (!f) return false
  const heute = new Date().toISOString().slice(0, 10)
  return f < heute
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
