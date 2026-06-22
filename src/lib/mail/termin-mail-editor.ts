import { mailBegruessungZeile, mailText, resolveMailAnrede, type MailAnrede } from '@/lib/mail/anrede'
import { plainTextToMailParagraphs } from '@/lib/mail/freitext-kunden-mail'

/** Nicht löschen — danach kommen Termin-Box, Rückfragen, Kollege, Ablauf. */
export const TERMIN_MAIL_AUTO_MARKER =
  '[Termin-Details und weiterer Inhalt werden automatisch ergänzt]'

export function terminMailBodyForEditor(
  anrede: MailAnrede,
  name: string,
  _terminTitel?: string
): string {
  const gruss = mailBegruessungZeile(anrede, name)
  const best = mailText(
    anrede,
    'hiermit bestätigen wir deinen Vor-Ort-Termin:',
    'hiermit bestätigen wir Ihren Vor-Ort-Termin:'
  )
  return `${gruss}\n\n${best}\n\n${TERMIN_MAIL_AUTO_MARKER}`
}

export function parseTerminMailIntroFromEditor(bodyText: string): string {
  const marker = TERMIN_MAIL_AUTO_MARKER
  const idx = bodyText.indexOf(marker)
  return (idx >= 0 ? bodyText.slice(0, idx) : bodyText).trim()
}

export function terminMailIntroToHtml(introPlain: string): string {
  return plainTextToMailParagraphs(introPlain)
}

export function mergeTerminMailBodyText(
  previousBody: string | undefined,
  anrede: MailAnrede,
  name: string,
  terminTitel: string
): string {
  const nextDefault = terminMailBodyForEditor(anrede, name, terminTitel)
  if (!previousBody?.trim()) return nextDefault
  if (previousBody.trim() === nextDefault.trim()) return nextDefault
  if (previousBody.includes(TERMIN_MAIL_AUTO_MARKER)) return previousBody
  const intro = parseTerminMailIntroFromEditor(previousBody)
  if (!intro) return nextDefault
  return `${intro}\n\n${TERMIN_MAIL_AUTO_MARKER}`
}

export function resolveTerminMailAnrede(kundeTyp?: string | null): MailAnrede {
  return resolveMailAnrede(undefined, kundeTyp)
}
