/**
 * Kunden-Informationsmail bei angenommener Regie / weiterer Arbeit.
 * Ton: informierend, nicht fragend — keine Freigabe, kein Zustimmungsknopf.
 * Nur Kundenseite: kein Partnersatz, kein Partnerbetrag, keine Korrekturbegründung.
 */
import type { MailBranding } from '@/lib/mail-branding'
import { buildSubject } from '@/lib/mail/build-subject'
import {
  mailHtmlBase,
  mailKundenContactLine,
  mailKundenGruss,
  mailKundenPortalTop,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import { formatEuro, formatNumber } from '@/lib/format/geld-datum'
import { formatDatum } from '@/lib/utils'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type RegieInformationKundenMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  /** Auftrag / Projekt für Betreff und Kontext. */
  projektTitel: string
  /** Titel nach etwaiger Korrektur. */
  positionTitel: string
  /** Beschreibung nach etwaiger Korrektur. */
  positionBeschreibung?: string | null
  /** Stunden dieser Position. */
  stunden?: number | null
  /** Kundensatz €/h — nie Partnersatz. */
  kundensatz?: number | null
  /** Betrag dieser Position (Kunde). */
  positionsBetrag?: number | null
  /** Neue Gesamtsumme des Vorgangs (Kunde). */
  vorgangGesamtsumme?: number | null
  /** Datum der Entscheidung / Leistung. */
  datum?: string | null
  statusLink?: string | null
}

/**
 * Betreff: Objekt = Projekt, Ereignis = zusätzliche Leistung übernommen.
 */
export function regieInformationKundenMailBetreff(
  projektTitel: string | null | undefined
): string {
  return buildSubject({
    objekt: projektTitel?.trim() || 'Ihr Projekt',
    ereignis: 'Zusätzliche Leistung übernommen',
  })
}

export function buildRegieInformationKundenMail(
  data: RegieInformationKundenMailInput,
  branding: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(
    data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,')
  )
  const projekt = data.projektTitel.trim() || (anrede === 'du' ? 'dein Projekt' : 'Ihr Projekt')
  const titel = data.positionTitel.trim() || 'Zusätzliche Leistung'
  const betreff = regieInformationKundenMailBetreff(data.projektTitel)

  const introInformierend =
    anrede === 'du'
      ? `bei ${esc(projekt)} wurde eine zusätzliche Leistung übernommen. Hier die Details:`
      : `bei ${esc(projekt)} wurde eine zusätzliche Leistung übernommen. Hier die Details:`
  const stundenLabel =
    data.stunden != null && Number.isFinite(data.stunden) && data.stunden > 0
      ? `${formatNumber(data.stunden, { decimals: 1 })} Std`
      : null
  const satzLabel =
    data.kundensatz != null &&
    Number.isFinite(data.kundensatz) &&
    data.kundensatz > 0
      ? `${formatEuro(data.kundensatz, { style: 'currency' })}/h`
      : null
  const positionsBetragLabel =
    data.positionsBetrag != null && Number.isFinite(data.positionsBetrag)
      ? formatEuro(data.positionsBetrag, { style: 'currency' })
      : null
  const gesamtsummeLabel =
    data.vorgangGesamtsumme != null && Number.isFinite(data.vorgangGesamtsumme)
      ? formatEuro(data.vorgangGesamtsumme, { style: 'currency' })
      : null
  const datumLabel = data.datum?.trim()
    ? formatDatum(data.datum.trim())
    : null

  const metaParts = [
    stundenLabel,
    satzLabel ? `Satz ${satzLabel}` : null,
    datumLabel ? `Datum ${datumLabel}` : null,
  ].filter(Boolean)
  const metaHtml = metaParts.length
    ? `<p style="font-size:14px;color:${C.gray700};margin:0;line-height:1.5;">${esc(metaParts.join(' · '))}</p>`
    : undefined

  const beschreibung = data.positionBeschreibung?.trim()
  const beschreibungHtml = beschreibung
    ? `<p style="font-size:14px;color:${C.gray700};margin:12px 0 0;line-height:1.55;white-space:pre-wrap;">${esc(beschreibung)}</p>`
    : ''

  const summary = mailSummaryBlock({
    label: 'Zusätzliche Leistung',
    title: esc(titel),
    priceHtml: positionsBetragLabel
      ? `<p style="font-size:16px;font-weight:700;color:${C.greenDark};margin:0 0 4px;">${esc(positionsBetragLabel)}</p>`
      : undefined,
    metaHtml,
  })

  const gesamtsummeHtml = gesamtsummeLabel
    ? `<p style="font-size:14px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">
        Neue Gesamtsumme des Vorgangs: <strong>${esc(gesamtsummeLabel)}</strong>
      </p>`
    : ''

  const fragenZeile =
    anrede === 'du'
      ? `Fragen zu dieser Position? Antworte einfach auf diese E-Mail — wir melden uns.`
      : `Fragen zu dieser Position? Antworten Sie einfach auf diese E-Mail — wir melden uns.`

  const portalTop = mailKundenPortalTop(data.statusLink)
  const contact = mailKundenContactLine(anrede, branding.telefon)
  const gruss = mailKundenGruss(anrede)

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail zur Information über eine zusätzliche Leistung an deinem Projekt.'
      : 'Sie erhalten diese Mail zur Information über eine zusätzliche Leistung an Ihrem Projekt.'

  const preheader = `${titel} · ${projekt}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${introInformierend}</p>
      ${portalTop}
      ${summary}
      ${beschreibungHtml}
      ${gesamtsummeHtml}
      <p style="font-size:14px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${esc(fragenZeile)}</p>
      <p style="font-size:14px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    branding,
    disclaimer,
    mailKundenStandardOptions(anrede, data.statusLink)
  )

  return { betreff, html }
}
