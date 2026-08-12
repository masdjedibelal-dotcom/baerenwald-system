import { resolveAngebotKundeTyp, istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import {
  kundeAngebotBegruessung,
  type KundeAnredeKontext,
} from '@/lib/kunde-rechnungsempfaenger'

export type MailAnrede = 'du' | 'sie'

/** Privat → Du; Gewerbe / Hausverwaltung → Sie. */
export function mailAnredeFromKundeTyp(kundeTyp?: string | null): MailAnrede {
  return istPrivatKundeTyp(kundeTyp) ? 'du' : 'sie'
}

export function mailAnredeFromKundenUndLead(
  kundenTyp?: string | null,
  leadKundentyp?: string | null
): MailAnrede {
  return mailAnredeFromKundeTyp(resolveAngebotKundeTyp(kundenTyp, leadKundentyp))
}

export function resolveMailAnrede(
  explicit?: MailAnrede | null,
  kundeTyp?: string | null
): MailAnrede {
  if (explicit === 'du' || explicit === 'sie') return explicit
  if (kundeTyp != null && String(kundeTyp).trim() !== '') {
    return mailAnredeFromKundeTyp(kundeTyp)
  }
  return 'du'
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
