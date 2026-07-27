/**
 * Einheitliche Kurz-Labels für PhaseCard / Zugehörig —
 * gleiche Sprache wie Header-Badges (status-display / vorgang-labels).
 */
import {
  anfrageStatusDisplay,
  angebotStatusDisplay,
  auftragStatusDisplay,
  rechnungStatusDisplay,
} from '@/lib/status/status-display'
import { unterstatusLabel } from '@/lib/vorgang/vorgang-labels'

/** Angebotsnummer wie im Rest des CRM — ohne doppeltes „AG-“. */
export function angebotNrAnzeige(
  angebotsnr: string | null | undefined,
  id: string
): string {
  const nr = angebotsnr?.trim()
  if (nr) return nr
  return `AG-${id.slice(0, 8).toUpperCase()}`
}

export function anfrageStatusKurz(status: string): string {
  return anfrageStatusDisplay(status).label
}

export function angebotStatusKurz(
  status: string,
  statusEinfach?: string | null
): string {
  return angebotStatusDisplay({
    status,
    status_einfach: statusEinfach,
  }).label
}

export function auftragStatusKurz(status: string): string {
  return auftragStatusDisplay(status).label
}

export function rechnungStatusKurz(status: string): string {
  const key = status.trim().toLowerCase()
  if (key === 'ueberfaellig' || key === 'überfällig') return 'Überfällig'
  // Legacy-Alias aus Listen
  if (key === 'versendet') return 'Gesendet'
  return rechnungStatusDisplay(status).label
}

/** Fallback wenn Phase unbekannt — nie Roh-Keys wie „in_arbeit“ zeigen. */
export function phaseStatusKurz(
  phase: 'anfrage' | 'angebot' | 'auftrag' | 'rechnung',
  status: string,
  statusEinfach?: string | null
): string {
  switch (phase) {
    case 'anfrage':
      return anfrageStatusKurz(status)
    case 'angebot':
      return angebotStatusKurz(status, statusEinfach)
    case 'auftrag':
      return auftragStatusKurz(status)
    case 'rechnung':
      return rechnungStatusKurz(status)
    default:
      return unterstatusLabel('anfrage', status)
  }
}

export function abnahmeMetaKurz(opts: {
  anKundeGesendetAt?: string | null
  pdfUrl?: string | null
}): string {
  if (opts.anKundeGesendetAt) return 'An Kunde gesendet'
  if (opts.pdfUrl) return 'PDF bereit'
  return 'Entwurf'
}

export function formatEurKurz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return (
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    ' €'
  )
}
