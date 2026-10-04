import { formatEuro } from '@/lib/format/geld-datum'
/**
 * Einheitliche Kurz-Labels für Projekt-Kontext /
 * EntityProjektUebersichtCard (PhaseCard/ZugehoerigListe entfernt).
 * gleiche Sprache wie Header-Badges (status-display / vorgang-labels).
 */
import {
  angebotStatusDisplay,
  auftragStatusDisplay,
  rechnungStatusDisplay
} from '@/lib/status/status-display'
import { nettoZuBrutto,resolveAngebotGesamtbetrag } from '@/lib/angebot-einfach'

/** Angebotsnummer wie im Rest des CRM — ohne doppeltes „AG-“. */
export function angebotNrAnzeige(
  angebotsnr: string | null | undefined,
  id: string
): string {
  const nr = angebotsnr?.trim()
  if (nr) return nr
  return `AG-${id.slice(0, 8).toUpperCase()}`
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
  if (key === 'ueberfaellig' || key === 'überfällig') return 'Fällig'
  // Legacy-Alias aus Listen
  if (key === 'versendet') return rechnungStatusDisplay('gesendet').label
  return rechnungStatusDisplay(status).label
}

export function formatEurKurz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return formatEuro(n)
}

/** Angebots-Summen in CRM-Phasen-UI: DB speichert netto, Anzeige wie Kunden-Mail (brutto). */
export function formatAngebotEurKurzBrutto(
  gesamt_fix: number | null | undefined,
  gesamt_min: number | null | undefined,
  gesamt_max: number | null | undefined,
  mwstSatz = 19
): string {
  const netto = resolveAngebotGesamtbetrag(gesamt_fix, gesamt_min, gesamt_max)
  if (netto == null) return '—'
  return formatEurKurz(nettoZuBrutto(netto, mwstSatz))
}
