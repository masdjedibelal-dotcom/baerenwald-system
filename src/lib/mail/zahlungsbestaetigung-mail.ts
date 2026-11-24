import type { MailBranding } from '@/lib/mail-branding'
import { mailBetragPriceHtml } from '@/lib/mail/betrag-label'
import { buildSubject } from '@/lib/mail/build-subject'
import {
  mailHtmlBase,
  mailKundenGruss,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import { formatEuro } from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type ZahlungsbestaetigungMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  rechnungsnummer: string
  brutto: number
  bezahltAm: string
  projektTitel?: string | null
  reverseCharge?: boolean
}

export function zahlungsbestaetigungMailBetreff(
  projektTitel: string | null | undefined,
  rechnungsnummer: string
): string {
  return buildSubject({
    objekt: projektTitel,
    ereignis: 'Zahlung erhalten',
    nummer: rechnungsnummer,
  })
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
      ? 'vielen Dank — deine Zahlung ist bei uns eingegangen.'
      : 'vielen Dank — Ihre Zahlung ist bei uns eingegangen.'

  const summaryHtml = mailSummaryBlock({
    label: anrede === 'du' ? `ZAHLUNG ERHALTEN · ${nr}` : `ZAHLUNG ERHALTEN · ${nr}`,
    title: titel,
    priceHtml: mailBetragPriceHtml(data.brutto, { reverseCharge: data.reverseCharge }),
    metaHtml: `<p style="font-size:13px;color:${C.gray700};margin:8px 0 0;"><strong>Bezahlt am:</strong> ${bezahltAm}</p>`,
  })

  const gruss = mailKundenGruss(anrede)

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail als Bestätigung deiner Zahlung.'
      : 'Sie erhalten diese Mail als Bestätigung Ihrer Zahlung.'

  const preheader = `${data.rechnungsnummer} · ${formatEuro(data.brutto)} · bezahlt am ${data.bezahltAm}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    mailKundenStandardOptions(anrede)
  )

  return {
    betreff: zahlungsbestaetigungMailBetreff(data.projektTitel, data.rechnungsnummer),
    html,
  }
}
