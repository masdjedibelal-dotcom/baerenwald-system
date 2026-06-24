import type { MailBranding } from '@/lib/mail-branding'
import {
  mailHtmlBase,
  mailKundenContactLine,
  mailKundenGruss,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
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

export type ZahlungsbestaetigungMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  rechnungsnummer: string
  brutto: number
  bezahltAm: string
  projektTitel?: string | null
}

export function zahlungsbestaetigungMailBetreff(
  anrede: AngebotMailAnrede,
  rechnungsnummer: string,
  firmenname: string
): string {
  return anrede === 'du'
    ? `Zahlung erhalten — Rechnung ${rechnungsnummer} · ${firmenname}`
    : `Zahlung erhalten — Rechnung ${rechnungsnummer} · ${firmenname}`
}

export function buildZahlungsbestaetigungMail(
  data: ZahlungsbestaetigungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nr = esc(data.rechnungsnummer)
  const bezahltAm = esc(data.bezahltAm)
  const titel = esc(data.projektTitel?.trim() || data.rechnungsnummer)

  const intro =
    anrede === 'du'
      ? 'vielen Dank — wir haben deine Zahlung erhalten. Kurz zur Bestätigung:'
      : 'vielen Dank — wir haben Ihre Zahlung erhalten. Kurz zur Bestätigung:'

  const abschlussHinweis =
    anrede === 'du'
      ? 'Damit ist diese Rechnung für uns erledigt. Bei Fragen zum Projekt oder zu weiteren Schritten melde dich gern.'
      : 'Damit ist diese Rechnung für uns erledigt. Bei Fragen zum Projekt oder zu weiteren Schritten melden Sie sich gern.'

  const summaryHtml = mailSummaryBlock({
    label: anrede === 'du' ? `ZAHLUNG ERHALTEN · ${nr}` : `ZAHLUNG ERHALTEN · ${nr}`,
    title: titel,
    priceHtml: `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${formatEur(data.brutto)} € <span style="font-size:12px;font-weight:400;color:#6B7280;">inkl. MwSt.</span></p>`,
    metaHtml: `<p style="font-size:13px;color:#374151;margin:8px 0 0;"><strong>Bezahlt am:</strong> ${bezahltAm}</p>`,
  })

  const contact = mailKundenContactLine(anrede, b.telefon)
  const gruss = mailKundenGruss(anrede)

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail als Bestätigung deiner Zahlung.'
      : 'Sie erhalten diese Mail als Bestätigung Ihrer Zahlung.'

  const preheader = `${data.rechnungsnummer} · ${formatEur(data.brutto)} € · bezahlt am ${data.bezahltAm}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.6;">${esc(abschlussHinweis)}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    mailKundenStandardOptions(anrede)
  )

  return {
    betreff: zahlungsbestaetigungMailBetreff(anrede, data.rechnungsnummer, b.firmenname),
    html,
  }
}
