export type KommunikationKontextTyp = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung' | 'kunde'

export type KommunikationMailVorlageKontext = KommunikationKontextTyp | 'alle'

export const KOMMUNIKATION_KONTEXT_LABELS: Record<KommunikationKontextTyp, string> = {
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
  kunde: 'Kunde',
}

export const KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS: { value: KommunikationMailVorlageKontext; label: string }[] = [
  { value: 'alle', label: 'Alle Kontexte' },
  { value: 'anfrage', label: 'Anfrage' },
  { value: 'angebot', label: 'Angebot' },
  { value: 'auftrag', label: 'Auftrag' },
  { value: 'rechnung', label: 'Rechnung' },
  { value: 'kunde', label: 'Kunde' },
]

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

export function freitextMailTypLabel(typ: string, kontextTyp?: string | null): string {
  if (typ.startsWith('antwort_')) {
    const k = typ.replace('antwort_', '') as KommunikationKontextTyp
    return `Antwort (${KOMMUNIKATION_KONTEXT_LABELS[k] ?? kontextTyp ?? 'E-Mail'})`
  }
  if (typ === 'antwort') return 'Antwort (E-Mail)'
  if (typ.startsWith('freitext_')) {
    const k = typ.replace('freitext_', '') as KommunikationKontextTyp
    return `E-Mail (${KOMMUNIKATION_KONTEXT_LABELS[k] ?? kontextTyp ?? 'Freitext'})`
  }
  const map: Record<string, string> = {
    anfrage_bestaetigung: 'Anfrage-Bestätigung',
    angebot: 'Angebot',
    angebot_nachfass: 'Angebot-Erinnerung',
    auftragsbestaetigung: 'Auftragsbestätigung',
    update_hinweis: 'Update',
    projekt_update: 'Bautagebuch / Update',
    rechnung: 'Rechnung',
    zahlungsbestaetigung: 'Zahlungsbestätigung',
    zahlungserinnerung: 'Zahlungserinnerung',
    bautagebuch: 'Bautagebuch',
    nachtrag: 'Nachtrag',
    abnahmeprotokoll: 'Abnahme',
    abschlussdokumentation: 'Abschluss',
    besichtigung_termin: 'Besichtigungstermin',
  }
  return map[typ] ?? typ
}
