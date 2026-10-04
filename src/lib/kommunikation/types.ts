export type KommunikationKontextTyp = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung' | 'kunde'

export type KommunikationMailVorlageKontext = KommunikationKontextTyp | 'alle'

export type MailComposeContext = {
  kontextTyp: KommunikationKontextTyp
  kundeId: string
  kundeName: string
  kundeTyp?: string | null
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
  defaultTo?: string
  defaultCc?: string[]
  statusLink?: string | null
}

export type KommunikationListeZeile = {
  id: string
  typ: string
  kontext_typ: string | null
  richtung: string
  an_email: string
  von_email: string | null
  cc_email: string | null
  betreff: string
  created_at: string
  status: string
  gesendet_von: string | null
  gesendet_von_name: string | null
}

/** Versteckter Marker in ausgehenden Mails für Antwort-Zuordnung. */
export const EMAIL_LOG_HTML_MARKER_PREFIX = 'baerenwald-email-log:'

export function emailLogHtmlMarker(logId: string): string {
  return `<!-- ${EMAIL_LOG_HTML_MARKER_PREFIX}${logId} -->`
}

export function parseEmailLogIdFromHtml(html: string): string | null {
  const m = html.match(new RegExp(`${EMAIL_LOG_HTML_MARKER_PREFIX}([0-9a-f-]{36})`, 'i'))
  return m?.[1] ?? null
}

export function freitextMailTyp(kontext: KommunikationKontextTyp): string {
  return `freitext_${kontext}`
}
