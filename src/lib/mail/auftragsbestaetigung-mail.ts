import type { MailBranding } from '@/lib/mail-branding'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
  type KundeRechnungsempfaenger,
} from '@/lib/kunde-rechnungsempfaenger'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { mailHtmlBase, mailSummaryBlock } from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type AuftragsbestaetigungMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  gewerke: string[]
  leistungsumfang: string
  startDatum: string
  endDatum?: string | null
  bruttoSumme?: string | null
  statusLink?: string | null
  previewMode?: boolean
}

export function auftragsbestaetigungMailBetreff(
  anrede: AngebotMailAnrede,
  leistungsumfang: string,
  firmenname: string
): string {
  const titel = leistungsumfang.trim() || 'Ihr Projekt'
  return anrede === 'du'
    ? `Dein Auftrag ist bestätigt — ${titel} · ${firmenname}`
    : `Ihr Auftrag ist bestätigt — ${titel} · ${firmenname}`
}

export function buildAuftragsbestaetigungMail(
  data: AuftragsbestaetigungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const gw = esc(data.gewerke.join(', ') || 'Ihr Projekt')
  const lu = esc(data.leistungsumfang.trim() || 'Ihr Projekt')
  const start = esc(data.startDatum)
  const end = data.endDatum?.trim() ? esc(data.endDatum.trim()) : null
  const zeitraum = end ? `${start} – ${end}` : `ab ${start}`
  const brutto = data.bruttoSumme?.trim()

  const intro =
    anrede === 'du'
      ? 'super — dein Auftrag ist bestätigt. Hier eine kurze Übersicht und was als Nächstes passiert:'
      : 'vielen Dank — Ihr Auftrag ist bestätigt. Hier eine kurze Übersicht und was als Nächstes passiert:'

  const stepsDu = [
    'Wir planen Termine und koordinieren die Gewerke für dich.',
    'Pro Meilenstein oder abgeschlossenem Gewerk erhältst du per E-Mail ein Update mit Link zu deinem Projekttagebuch — dort findest du auf der Landingpage alle Details, Fotos und den Verlauf.',
    'Wir führen die Arbeiten gemäß Angebot aus.',
    'Zum Abschluss: Abnahme, Abschlussdokumentation und Rechnung.',
  ]
  const stepsSie = [
    'Wir planen Termine und koordinieren die Gewerke für Sie.',
    'Pro Meilenstein oder abgeschlossenem Gewerk erhalten Sie per E-Mail ein Update mit Link zu Ihrem Projekttagebuch — dort finden Sie auf der Landingpage alle Details, Fotos und den Verlauf.',
    'Wir führen die Arbeiten gemäß Angebot aus.',
    'Zum Abschluss: Abnahme, Abschlussdokumentation und Rechnung.',
  ]
  const steps = anrede === 'du' ? stepsDu : stepsSie
  const stepsHtml = steps
    .map(
      (s) => `<li style="margin:0 0 8px;color:#374151;line-height:1.6;">${esc(s)}</li>`
    )
    .join('')
  const stepsTitle = anrede === 'du' ? 'Das passiert als Nächstes' : 'Das passiert als Nächstes'

  const summaryHtml = mailSummaryBlock({
    label: anrede === 'du' ? 'DEIN AUFTRAG' : 'IHR AUFTRAG',
    title: lu,
    priceHtml: brutto
      ? `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${esc(brutto)} <span style="font-size:12px;font-weight:400;color:#6B7280;">inkl. MwSt.</span></p>`
      : '',
    metaHtml: `<p style="font-size:13px;color:#374151;margin:8px 0 0;"><strong>Zeitraum:</strong> ${zeitraum}</p><p style="font-size:13px;color:#374151;margin:4px 0 0;"><strong>Gewerke:</strong> ${gw}</p>`,
  })

  const link = data.statusLink?.trim() ?? ''
  const ctaLabel = anrede === 'du' ? 'Projekttagebuch öffnen' : 'Projekttagebuch öffnen'
  const ctaHint =
    anrede === 'du'
      ? 'Über diesen Link erreichst du jederzeit dein Projekttagebuch. Neue Meilensteine und Gewerk-Updates schicken wir dir zusätzlich per E-Mail.'
      : 'Über diesen Link erreichen Sie jederzeit Ihr Projekttagebuch. Neue Meilensteine und Gewerk-Updates senden wir Ihnen zusätzlich per E-Mail.'
  const ctaHtml =
    link && !data.previewMode
      ? `<p style="margin:20px 0 8px;">${mailPrimaryButtonHtml(`${ctaLabel} →`, link, { margin: '0', size: 'sm' })}</p><p style="font-size:12px;color:#6B7280;margin:0 0 16px;line-height:1.5;">${esc(ctaHint)}</p><p style="font-size:12px;color:#6B7280;margin:0 0 16px;"><a href="${esc(link)}" style="color:#2E7D52;text-decoration:underline;word-break:break-all;">Link zum Projekttagebuch</a></p>`
      : data.previewMode
        ? `<p style="font-size:13px;color:#6B7280;margin:16px 0 0;font-style:italic;line-height:1.5;">${
            anrede === 'du'
              ? 'Der persönliche Link zum Projekttagebuch wird beim Erstellen des Auftrags erzeugt. Pro Meilenstein bzw. Gewerkabschluss erhältst du zusätzlich eine Update-E-Mail mit Link zur Landingpage.'
              : 'Der persönliche Link zum Projekttagebuch wird beim Erstellen des Auftrags erzeugt. Pro Meilenstein bzw. Gewerkabschluss erhalten Sie zusätzlich eine Update-E-Mail mit Link zur Landingpage.'
          }</p>`
        : ''

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

  const betreff = auftragsbestaetigungMailBetreff(anrede, data.leistungsumfang, b.firmenname)
  const preheader =
    anrede === 'du'
      ? `Auftrag bestätigt · ${zeitraum}`
      : `Auftrag bestätigt · ${zeitraum}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      <p style="font-size:14px;font-weight:600;color:#111111;margin:0 0 8px;">${stepsTitle}</p>
      <ol style="margin:0 0 16px;padding-left:20px;">${stepsHtml}</ol>
      ${ctaHtml}
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    undefined,
    { anrede, statusLink: link || null }
  )

  return { betreff, html }
}

export function auftragsbestaetigungMailFromEmpfaenger(input: {
  empfaenger: Pick<
    KundeRechnungsempfaenger,
    'name' | 'vorname' | 'nachname' | 'ansprechpartner' | 'typ'
  >
  anrede: AngebotMailAnrede
  gewerke: string[]
  leistungsumfang: string
  startDatum: string
  endDatum?: string | null
  bruttoSumme?: string | null
  statusLink?: string | null
  previewMode?: boolean
  branding: MailBranding
}): { betreff: string; html: string } {
  const ctx = kundeAnredeKontextFromEmpfaenger(input.empfaenger)
  return buildAuftragsbestaetigungMail(
    {
      anrede: input.anrede,
      begruessung: kundeAngebotBegruessung(input.anrede, ctx),
      gewerke: input.gewerke,
      leistungsumfang: input.leistungsumfang,
      startDatum: input.startDatum,
      endDatum: input.endDatum,
      bruttoSumme: input.bruttoSumme,
      statusLink: input.statusLink,
      previewMode: input.previewMode,
    },
    input.branding
  )
}
