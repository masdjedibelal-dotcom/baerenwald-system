import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import {
  kundeAngebotBegruessung,
  type KundeAnredeKontext,
} from '@/lib/kunde-rechnungsempfaenger'

export type MailAnrede = 'du' | 'sie'

/**
 * Kundenkommunikation: immer Sie (unabhängig vom Kundentyp).
 * Typ `du` bleibt für Alttexte / mailText-Zweige, wird aber nicht mehr gewählt.
 */
export function mailAnredeFromKundeTyp(_kundeTyp?: string | null): MailAnrede {
  return 'sie'
}

export function mailAnredeFromKundenUndLead(
  kundenTyp?: string | null,
  leadKundentyp?: string | null
): MailAnrede {
  void resolveAngebotKundeTyp(kundenTyp, leadKundentyp)
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
export function mailBegruessungZeile(
  anrede: MailAnrede,
  displayName: string,
  kunde?: KundeAnredeKontext | null
): string {
  if (kunde) return kundeAngebotBegruessung(anrede, kunde)
  const name = displayName.trim() || 'Kundin/Kunde'
  if (anrede === 'du') {
    const vorname = name.split(/\s+/)[0] || name
    return `Hallo ${vorname},`
  }
  return `Guten Tag ${name},`
}

export function mailTeamGruss(anrede: MailAnrede, firmenname: string): string {
  const team = firmenname.trim() || 'Bärenwald'
  return anrede === 'du'
    ? `Viele Grüße<br/><strong>Dein ${team} Team</strong>`
    : `Mit freundlichen Grüßen<br/><strong>Ihr ${team} Team</strong>`
}
