import type { MailBranding } from '@/lib/mail-branding'
import { mailHtmlBase, mailSummaryBlock } from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEur(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type RechnungMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  rechnungsnummer: string
  brutto: number
  faelligAm: string
  /** z. B. Leistungsumfang aus Angebot — sonst nur Rechnungsnummer in der Box */
  projektTitel?: string | null
}

export function rechnungMailBetreff(
  anrede: AngebotMailAnrede,
  rechnungsnummer: string,
  firmenname: string
): string {
  return anrede === 'du'
    ? `Deine Rechnung ${rechnungsnummer} · ${firmenname}`
    : `Ihre Rechnung ${rechnungsnummer} · ${firmenname}`
}

export function buildRechnungMail(
  data: RechnungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nr = esc(data.rechnungsnummer)
  const faellig = esc(data.faelligAm)
  const titel = esc(data.projektTitel?.trim() || data.rechnungsnummer)

  const intro =
    anrede === 'du'
      ? 'anbei findest du deine Rechnung als PDF — kurz zur Übersicht:'
      : 'anbei erhalten Sie Ihre Rechnung als PDF — kurz zur Übersicht:'

  const pdfHinweis =
    anrede === 'du'
      ? 'Alle Positionen, Zahlungsdaten und den Verwendungszweck findest du im PDF-Anhang.'
      : 'Alle Positionen, Zahlungsdaten und den Verwendungszweck finden Sie im PDF-Anhang.'

  const summaryHtml = mailSummaryBlock({
    label: anrede === 'du' ? `DEINE RECHNUNG · ${nr}` : `IHRE RECHNUNG · ${nr}`,
    title: titel,
    priceHtml: `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${formatEur(data.brutto)} € <span style="font-size:12px;font-weight:400;color:#6B7280;">inkl. MwSt.</span></p>`,
    metaHtml: `<p style="font-size:13px;color:#374151;margin:8px 0 0;"><strong>Fällig am:</strong> ${faellig}</p>`,
  })

  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const contact =
    anrede === 'du'
      ? `Bei Fragen erreichst du uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`
      : `Bei Fragen erreichen Sie uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`

  const gruss =
    anrede === 'du'
      ? 'Viele Grüße<br/><strong>Dein Bärenwald Team</strong>'
      : 'Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>'

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail, weil wir dir eine Rechnung zugesendet haben.'
      : 'Sie erhalten diese Mail, weil wir Ihnen eine Rechnung zugesendet haben.'

  const preheader = `${data.rechnungsnummer} · ${formatEur(data.brutto)} € · fällig ${data.faelligAm}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.6;">${pdfHinweis}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    { anrede }
  )

  return {
    betreff: rechnungMailBetreff(anrede, data.rechnungsnummer, b.firmenname),
    html,
  }
}
