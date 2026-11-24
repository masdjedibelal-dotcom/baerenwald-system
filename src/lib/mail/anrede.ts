import {
  kundeAngebotBegruessung,
  type KundeAnredeKontext,
} from '@/lib/kunde-rechnungsempfaenger'
import { MARKE } from '@/lib/marke'

export type MailAnrede = 'du' | 'sie'

/**
 * Kundenkommunikation: immer Sie (unabhängig vom Kundentyp).
 * Typ `du` bleibt für Alttexte / mailText-Zweige, wird aber nicht mehr gewählt.
 */
export function mailAnredeFromKundeTyp(_kundeTyp?: string | null): MailAnrede {
  return 'sie'
}

/** Explizite Anrede wird ignoriert — Kundenmails immer Sie. */
export function resolveMailAnrede(
  _explicit?: MailAnrede | null,
  _kundeTyp?: string | null
): MailAnrede {
  return 'sie'
}

/** Kurztext je nach Anrede (z. B. „Sie erhalten …“ / „Du erhältst …“). */
export function mailText(anrede: MailAnrede, du: string, sie: string): string {
  return anrede === 'du' ? du : sie
}

/** Begrüßungszeile in HTML-Mails (escaping erfolgt beim Einbau). */
const FIRMA_RE = /\b(gmbh|mbh|ug|ag|gbr|kg|ohg|e\.?\s?v\.?|e\.?k\.?|hausverwaltung|verwaltung|immobilien|weg|eigentümergemeinschaft)\b/i

export function mailBegruessungZeile(
  anrede: MailAnrede,
  displayName: string,
  kunde?: KundeAnredeKontext | null
): string {
  if (kunde) return kundeAngebotBegruessung(anrede, kunde)
  const name = displayName.trim() || 'Kundin/Kunde'
  // Firmen nicht mit Namen anreden („Guten Tag Genius Hausverwaltung GmbH,“ wirkt automatisch)
  if (FIRMA_RE.test(name) || name === 'Kundin/Kunde') return anrede === 'du' ? 'Hallo,' : 'Guten Tag,'
  if (anrede === 'du') {
    const vorname = name.split(/\s+/)[0] || name
    return `Hallo ${vorname},`
  }
  return `Guten Tag ${name},`
}

export function mailTeamGruss(anrede: MailAnrede, firmenname: string): string {
  const team = firmenname.trim() || MARKE.name
  return anrede === 'du'
    ? `Viele Grüße<br/><strong>Dein ${team} Team</strong>`
    : `Mit freundlichen Grüßen<br/><strong>Ihr ${team} Team</strong>`
}
