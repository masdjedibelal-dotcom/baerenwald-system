import type { MailBranding } from '@/lib/mail-branding'
import { mailAnredeFromKundeTyp, mailBegruessungZeile, mailTeamGruss } from '@/lib/mail/anrede'
import { buildSubject } from '@/lib/mail/build-subject'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { mailHtmlBase, mailSummaryBlock } from '@/lib/mail-templates'
import { formatEuro } from '@/lib/format/geld-datum'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function datum(iso: string | null | undefined): string {
  const d = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return ''
  const [y, m, t] = d.split('-')
  return `${t}.${m}.${y}`
}

/** Neue Anweisung an den Partner (Umbau P11): was, wann, wo, EK — keine Positionen, keine VK. */
export function buildEinsatzPartnerMail(
  input: {
    partnerName: string
    titel: string
    anweisung: string | null
    terminVon: string | null
    terminBis: string | null
    ort: string | null
    kontaktVorOrt: string | null
    ekBetrag: number | null
    ekArt: 'netto' | 'brutto'
    portalLink: string
  },
  branding: MailBranding
): { betreff: string; html: string } {
  const anrede = mailAnredeFromKundeTyp(null)
  const wann = [datum(input.terminVon), datum(input.terminBis)].filter(Boolean).join(' bis ')
  const betreff = buildSubject({ ereignis: 'Neuer Einsatz', objekt: input.ort, nummer: null })
  const meta = [
    wann ? `<b>Wann:</b> ${esc(wann)}` : '',
    input.ort ? `<b>Wo:</b> ${esc(input.ort)}` : '',
    input.kontaktVorOrt ? `<b>Kontakt vor Ort:</b> ${esc(input.kontaktVorOrt)}` : '',
  ]
    .filter(Boolean)
    .join('<br>')
  const summary = mailSummaryBlock({
    label: 'Einsatz',
    title: esc(input.titel),
    priceHtml:
      input.ekBetrag != null && input.ekBetrag > 0
        ? `${esc(formatEuro(input.ekBetrag))} ${input.ekArt === 'netto' ? 'netto' : 'brutto'}`
        : undefined,
    metaHtml: meta || undefined,
  })
  const text = input.anweisung?.trim()
    ? `<p style="margin:16px 0;white-space:pre-wrap">${esc(input.anweisung.trim())}</p>`
    : ''
  const content = `
    <p>${esc(mailBegruessungZeile(anrede, input.partnerName))}</p>
    <p>wir haben einen neuen Einsatz für Sie. Bitte nehmen Sie ihn im Partner-Portal an oder lehnen Sie ihn ab.</p>
    ${summary}
    ${text}
    ${mailPrimaryButtonHtml('Einsatz ansehen', input.portalLink)}
    <p>${esc(mailTeamGruss(anrede, branding.firmenname ?? ''))}</p>`
  return { betreff, html: mailHtmlBase(content, `Neuer Einsatz: ${input.titel}`, branding) }
}
