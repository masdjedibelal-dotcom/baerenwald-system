import type { KundeAnredeKontext } from '@/lib/kunde-rechnungsempfaenger'
import type { MailBranding } from '@/lib/mail-branding'
import { mailPrimaryButtonHtml,mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'
import { buildPartnerSubject,buildSubject } from '@/lib/mail/build-subject'
import {
buildPortalLoginLink,
portalMailButtonLabel,
portalMailPsIntro,
type PortalMailAudience,
} from '@/lib/portal-utils'
import { buildAuftragsbestaetigungMail } from '@/lib/mail/auftragsbestaetigung-mail'
import { mailKiVisualisierungBlock } from '@/lib/visualize/mail-block'
import {
zahlungserinnerungBetreff,
zahlungserinnerungZahlbarBis,
type ZahlungserinnerungMailInput,
type ZahlungserinnerungStufe,
} from '@/lib/mail/zahlungserinnerung-mail'
import {
mailBegruessungZeile,
mailTeamGruss,
mailText,
resolveMailAnrede,
type MailAnrede,
} from '@/lib/mail/anrede'
import { BEREICH_LABELS } from '@/lib/utils'
import { filterAdressRueckfragen,type VorOrtRueckfrage } from '@/lib/anfrage-adresse'
import { anfrageBetreffNachAnlass } from '@/lib/email/meldung-mail-templates'
import { formatEuro,formatEuroSpanne } from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MAIL_MARKENNAME = 'Bärenwald'

/** Logo + Markenname „Bärenwald“ (grüner oder heller Kopf). */
export function mailLogoMitMarkenname(
  b: MailBranding,
  variant: 'onDark' | 'onLight' = 'onDark'
): string {
  const logo =
    variant === 'onLight' ? (b.logoUrlOnLight?.trim() ?? '') : (b.logoUrl?.trim() ?? '')
  const textColor = variant === 'onLight' ? C.greenDark : C.white
  const logoImg =
    logo && /^https?:\/\//i.test(logo)
      ? `<img src="${esc(logo)}" width="36" height="36" alt="${esc(MAIL_MARKENNAME)}" style="display:block;width:36px;height:36px;border:0;"/>`
      : ''
  if (!logoImg) {
    return `<span style="color:${textColor};font-size:20px;font-weight:700;letter-spacing:-0.02em;">${esc(MAIL_MARKENNAME)}</span>`
  }
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
  <tr>
    <td valign="middle" style="padding-right:10px;">${logoImg}</td>
    <td valign="middle" style="font-size:20px;font-weight:700;color:${textColor};letter-spacing:-0.02em;line-height:1;">${esc(MAIL_MARKENNAME)}</td>
  </tr>
</table>`
}

/** Zusammenfassung ohne Karten-Rahmen (Anfrage / Angebot). */
export function mailSummaryBlock(opts: {
  label: string
  title: string
  priceHtml?: string
  metaHtml?: string
}): string {
  return `<div style="margin:0 0 24px;">
    <p style="font-size:11px;font-weight:600;color:${C.gray500};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${opts.label}</p>
    <p style="font-size:17px;font-weight:700;color:${C.gray900};margin:0 0 6px;line-height:1.35;">${opts.title}</p>
    ${opts.priceHtml ?? ''}
    ${opts.metaHtml ?? ''}
  </div>`
}

export type MailHtmlBaseOptions = {
  /** Kein Portal-P.S. (interne / Partner-Mails). */
  skipMeinBaerenwaldPs?: boolean
  anrede?: 'du' | 'sie'
  /** Link für P.S.-Button (Standard: /portal/login). */
  portalLink?: string | null
  /** privat = MeinBärenwald · organisation = Auftraggeber-Portal */
  portalAudience?: PortalMailAudience
  /** @deprecated Alias für portalLink. */
  statusLink?: string | null
}

/** P.S. mit genau einem Portal-Button — nie zusätzlich im Mail-Body duplizieren. */
export function mailMeinBaerenwaldPsFooter(opts: {
  anrede: 'du' | 'sie'
  portalLink?: string
  audience?: PortalMailAudience
}): string {
  const audience = opts.audience ?? 'privat'
  const portal = opts.portalLink?.trim() || buildPortalLoginLink()
  const anrede = opts.anrede
  const text = portalMailPsIntro(audience, anrede)
  const buttonLabel = portalMailButtonLabel(audience)
  return `<div style="margin:28px 0 0;padding:16px 0 0;border-top:1px solid ${C.gray200};">
    <p style="font-size:15px;font-weight:700;color:${C.gray500};margin:0 0 8px;letter-spacing:0.02em;">P.S.</p>
    <p style="font-size:15px;color:${C.gray700};line-height:1.6;margin:0 0 12px;">${text}</p>
    ${mailSecondaryButtonHtml(buttonLabel, portal, { margin: '0' })}
  </div>`
}

/** Standard-Hülle: durchgehend weiß wie Anfrage-Bestätigung (kein grauer Rand, keine Card). */
export function mailHtmlBase(
  content: string,
  preheader: string,
  b: MailBranding,
  footerDisclaimer?: string,
  options?: MailHtmlBaseOptions
): string {
  const pre = preheader ? esc(preheader) : ''
  const websiteKurz = esc(formatWebsiteKurz(b.website))
  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const logoBlock = mailLogoMitMarkenname(b, 'onLight')
  const disclaimerHtml = footerDisclaimer?.trim()
    ? `<p style="font-size:11px;color:${C.gray300};margin:4px 0 0;line-height:1.5;">${esc(footerDisclaimer.trim())}</p>`
    : ''
  const portalLink =
    options?.portalLink?.trim() ||
    options?.statusLink?.trim() ||
    undefined
  const psHtml =
    options?.skipMeinBaerenwaldPs === true
      ? ''
      : mailMeinBaerenwaldPsFooter({
          anrede: options?.anrede ?? 'sie',
          portalLink,
          audience: options?.portalAudience ?? 'privat',
        })

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:${C.white};font-family:Arial,Helvetica,sans-serif;">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;">${pre}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.white};">
<tr><td align="center" style="padding:32px 16px;background:${C.white};">
<table width="580" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.white};max-width:580px;width:100%;">
<tr>
  <td style="padding:0 0 24px;border-bottom:1px solid ${C.gray200};background:${C.white};">
    ${logoBlock}
  </td>
</tr>
<tr>
  <td style="padding:32px 0 24px;background:${C.white};font-size:15px;color:${C.gray700};line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
    ${content}
    ${psHtml}
  </td>
</tr>
<tr>
  <td style="padding:20px 0 0;border-top:1px solid ${C.gray200};background:${C.white};">
    <p style="font-size:12px;color:${C.gray400};margin:0;line-height:1.6;">
      ${esc(b.firmenname)} · ${websiteKurz} · <a href="tel:${telHref}" style="color:${C.gray400};text-decoration:none;">${tel}</a>
    </p>
    ${disclaimerHtml}
  </td>
</tr>
</table>
</td></tr>
</table>
</body></html>`
}

/** Alias für Freigabe-Wording „buildStandardMailHtml“ (Portal-Äquivalent). */
export const buildStandardMailHtml = mailHtmlBase

/** Standard-Fuß: P.S. mit einem Portal-Button (nach Gruß & Inhalt). */
export function mailKundenStandardOptions(
  anrede: 'du' | 'sie',
  portalLink?: string | null,
  portalAudience?: PortalMailAudience
): MailHtmlBaseOptions {
  return {
    anrede,
    portalLink: portalLink?.trim() || undefined,
    portalAudience: portalAudience ?? 'privat',
  }
}

/** @deprecated Portal-Button gehört in den P.S.-Footer — nutze mailKundenStandardOptions(). */
export function mailKundenPortalTop(link?: string | null): string {
  const url = link?.trim() || buildPortalLoginLink()
  return `<p style="margin:0 0 20px;">${mailPrimaryButtonHtml('Zu MeinBärenwald →', url, { margin: '0' })}</p>`
}

export function mailKundenContactLine(anrede: 'du' | 'sie', telefon: string): string {
  const tel = esc(telefon)
  const telHref = tel.replace(/\s/g, '')
  return anrede === 'du'
    ? `Bei Fragen erreichst du uns unter <a href="tel:${telHref}" style="color:${C.green};text-decoration:none;">${tel}</a>.`
    : `Bei Fragen erreichen Sie uns unter <a href="tel:${telHref}" style="color:${C.green};text-decoration:none;">${tel}</a>.`
}

export function mailKundenGruss(anrede: 'du' | 'sie'): string {
  return anrede === 'du'
    ? 'Viele Grüße<br/><strong>Dein Bärenwald Team</strong>'
    : 'Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>'
}

function btn(text: string, url: string): string {
  return mailPrimaryButtonHtml(text, url)
}

function greenBox(html: string): string {
  return `<div style="background:${C.greenSoft};border-radius:8px;padding:16px 20px;margin:16px 0;">${html}</div>`
}

function greenHintBox(html: string): string {
  return `<div style="background:${C.greenSoft};border:1px solid ${C.greenSoftBorder};border-radius:8px;padding:16px 20px;margin:16px 0;">${html}</div>`
}

function whiteBorderBox(html: string): string {
  return `<div style="background:${C.white};border:1px solid ${C.gray200};border-radius:8px;padding:16px 20px;margin:12px 0;">${html}</div>`
}

function mailTerminDetailsInline(datumFmt: string, zeitText: string, ort: string): string {
  const zeit = esc(zeitText.trim() || '—')
  return `<p style="margin:0 0 18px;font-size:15px;color:${C.gray700};line-height:1.7;">
    <strong>Datum:</strong> ${esc(datumFmt)}<br/>
    <strong>Uhrzeit:</strong> ${zeit}<br/>
    <strong>Ort:</strong> ${esc(ort.trim() || '—')}
  </p>`
}

function mailObjektbetreuerTelLink(telefon: string): string {
  const t = telefon.trim()
  if (!t) return ''
  return `<a href="tel:${esc(t.replace(/\s/g, ''))}" style="color:${C.green};font-weight:600;">${esc(t)}</a>`
}

function mailKollegeVorOrtBlock(
  anrede: MailAnrede,
  kollege: { name: string; telefon: string }
): string {
  const name = esc(kollege.name.trim())
  const tel = mailObjektbetreuerTelLink(kollege.telefon)
  const telTeil = tel ? ` (${tel})` : ''
  const text = mailText(
    anrede,
    `Vor Ort ist <strong>${name}</strong>${telTeil} für dich da — in der Regel meldet er sich <strong>30–60 Minuten vorher</strong> telefonisch. Kurzfristige Änderungen bitte direkt bei <strong>${name}</strong>.`,
    `Vor Ort ist <strong>${name}</strong>${telTeil} für Sie da — in der Regel meldet er sich <strong>30–60 Minuten vorher</strong> telefonisch. Kurzfristige Änderungen bitte direkt bei <strong>${name}</strong>.`
  )
  return `<p style="margin:16px 0 0;font-size:15px;color:${C.gray700};line-height:1.6;">${text}</p>`
}

function mailVorOrtRueckfragenBlock(anrede: MailAnrede, items: VorOrtRueckfrage[]): string {
  const adressItems = filterAdressRueckfragen(items)
  if (!adressItems.length) return ''
  const intro = mailText(
    anrede,
    'Für den Termin fehlen uns noch — bitte kurz per Antwort auf diese E-Mail:',
    'Für den Termin fehlen uns noch — bitte kurz per Antwort auf diese E-Mail:'
  )
  const lis = adressItems
    .map((item) => {
      const label = anrede === 'du' ? item.du : item.sie
      return `<li style="margin:0 0 4px;font-size:15px;color:${C.greenDark};line-height:1.45;">${esc(label)}</li>`
    })
    .join('')
  return `${greenHintBox(`
    <p style="margin:0 0 8px;font-size:15px;color:${C.greenDark};line-height:1.5;">${intro}</p>
    <ul style="margin:0;padding-left:18px;color:${C.greenDark};">${lis}</ul>
  `)}`
}

/** Bestätigung Besichtigung / Kalender-Termin an Kund:in */
export function mailBesichtigungTermin(
  data: {
    name: string
    terminTitel: string
    datumFmt: string
    zeitText: string
    adresse: string
    notiz: string
    statusLink: string
    portalLink: string
    kollege?: { name: string; telefon: string } | null
    anrede?: MailAnrede
    kundeTyp?: string | null
    fehlendeRueckfragen?: VorOrtRueckfrage[]
    /** Plain-Text-Einleitung (vor automatischen Blöcken), als HTML-Absätze. */
    introHtml?: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const ort = data.adresse.trim() || '—'
  const zeitAnzeige = data.zeitText.trim() || '—'
  const notizBlock =
    data.notiz.trim().length > 0
      ? `<p style="margin:12px 0 0;font-size:15px;color:${C.gray700};line-height:1.55;"><strong>Hinweis:</strong> ${esc(data.notiz).replace(/\n/g, '<br/>')}</p>`
      : ''
  const bestaetigung = mailText(
    anrede,
    'hiermit bestätigen wir deinen Vor-Ort-Termin:',
    'hiermit bestätigen wir Ihren Vor-Ort-Termin:'
  )
  const introBlock =
    data.introHtml?.trim() ||
    `<p style="font-size:15px;color:${C.gray700};line-height:1.6;margin:0 0 6px;">${begruessung}</p>
      <p style="font-size:15px;color:${C.gray700};line-height:1.6;margin:0 0 14px;">${bestaetigung}</p>`
  return {
    betreff: buildSubject({
      objekt: data.adresse.trim() || data.terminTitel,
      ereignis: 'Terminbestätigung',
    }),
    html: mailHtmlBase(
      `
      ${introBlock}
      ${mailTerminDetailsInline(data.datumFmt, zeitAnzeige, ort)}
      ${mailVorOrtRueckfragenBlock(anrede, data.fehlendeRueckfragen ?? [])}
      ${data.kollege?.name?.trim() ? mailKollegeVorOrtBlock(anrede, data.kollege) : ''}
      ${notizBlock}
      <p style="font-size:15px;color:${C.gray700};margin:20px 0 0;">${mailTeamGruss(anrede, b.firmenname)}</p>
    `,
      `Termin am ${data.datumFmt}, ${ort}`,
      b,
      undefined,
      { anrede, statusLink: data.statusLink }
    ),
  }
}

function formatWebsiteKurz(website: string): string {
  return website
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
}

function formatPreisSpanne(min: number | null | undefined, max: number | null | undefined): string | null {
  const a = min != null && Number.isFinite(min) ? min : null
  const b = max != null && Number.isFinite(max) ? max : null
  if (a == null && b == null) return null
  return formatEuroSpanne(a, b, { decimals: 0 })
}

function anfrageProjektTitel(
  situation: string | null | undefined,
  bereiche: string[] | null | undefined,
  anrede: MailAnrede
): string {
  const b = (bereiche ?? []).filter(Boolean)
  if (b.length) {
    return b.map((key) => BEREICH_LABELS[key] ?? key).join(', ')
  }
  const s = String(situation ?? '').trim()
  return s || mailText(anrede, 'deine Anfrage', 'Ihre Anfrage')
}

/** Bestätigung nach Anfrage (Website / CRM) — Clean-Design wie Standard-Mails. */
export function mailAnfrageBestaetigung(
  data: {
    name: string
    anfrageRef: string
    situation?: string | null
    bereiche?: string[] | null
    preis_min?: number | null
    preis_max?: number | null
    /** website = Footer-Hinweis Webseite; sonst CRM-manuell */
    quelle?: 'website' | 'crm'
    anrede?: MailAnrede
    kundeTyp?: string | null
    anlass?: import('@/lib/types').LeadAnlass | null
    objektTitel?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const projektTitel = esc(anfrageProjektTitel(data.situation, data.bereiche, anrede))
  const ref = esc(data.anfrageRef.trim() || '—')
  const preis = formatPreisSpanne(data.preis_min, data.preis_max)
  const preisHtml = preis
    ? `<p style="font-size:16px;font-weight:700;color:${C.green};margin:0;">${esc(preis)}</p>`
    : ''
  const disclaimer =
    data.quelle === 'website'
      ? mailText(
          anrede,
          'Du erhältst diese Mail, weil du eine Anfrage über unsere Webseite gestellt hast.',
          'Sie erhalten diese Mail, weil Sie eine Anfrage über unsere Webseite gestellt haben.'
        )
      : mailText(
          anrede,
          'Du erhältst diese Mail, weil wir deine Anfrage aufgenommen haben.',
          'Sie erhalten diese Mail, weil wir Ihre Anfrage aufgenommen haben.'
        )

  const h1 = mailText(anrede, 'Danke für deine Anfrage.', 'Vielen Dank für Ihre Anfrage.')
  const einleitung = mailText(
    anrede,
    'deine Anfrage ist bei uns eingegangen. Wir schauen sie uns an und melden uns innerhalb von <strong>24–48 Stunden</strong> (Mo–Sa; an Sonntagen am folgenden Werktag) für einen Vor-Ort-Termin.',
    'Ihre Anfrage ist bei uns eingegangen. Wir prüfen sie und melden uns innerhalb von <strong>24–48 Stunden</strong> (Mo–Sa; an Sonntagen am folgenden Werktag) für einen Vor-Ort-Termin.'
  )
  const summaryLabel = mailText(anrede, `DEINE ANFRAGE · ${ref}`, `IHRE ANFRAGE · ${ref}`)
  const abschluss = mailText(anrede, 'Bis bald.', 'Mit freundlichen Grüßen')

  const content = `
      <h1 style="font-size:22px;font-weight:700;color:${C.gray900};margin:0 0 20px;">${h1}</h1>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 8px;line-height:1.6;">${begruessung}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 24px;line-height:1.6;">${einleitung}</p>
      ${mailSummaryBlock({
        label: summaryLabel,
        title: projektTitel,
        priceHtml: preisHtml,
      })}
      <p style="font-size:15px;color:${C.gray700};margin:0 0 4px;line-height:1.6;">${abschluss}</p>
      <p style="font-size:15px;color:${C.gray700};margin:16px 0 0;">${mailTeamGruss(anrede, b.firmenname)}</p>`

  const betreff = data.anlass
    ? anfrageBetreffNachAnlass(data.anlass, data.objektTitel ?? projektTitel.replace(/<[^>]+>/g, ''))
    : buildSubject({
        objekt: data.objektTitel ?? projektTitel.replace(/<[^>]+>/g, ''),
        ereignis: 'Anfrage erhalten',
      })

  return {
    betreff,
    html: mailHtmlBase(content, h1, b, disclaimer, { anrede }),
  }
}

type PosRow = {
  beschreibung?: string | null
  leistung?: string | null
  gesamt_fix?: number | null
  gesamt_min?: number | null
  gesamt_max?: number | null
}

export function mailAngebot(
  data: {
    name: string
    positionen: PosRow[]
    gesamt_min: number
    gesamt_max: number
    lohn_gesamt: number
    gueltig_bis: string
    statusLink: string
    anrede?: MailAnrede
    kundeTyp?: string | null
    visualisierung_vorschau_url?: string | null
    reverseCharge?: boolean
    /** Titel des Angebots (Leistungsumfang) — sonst erste Position */
    titel?: string | null
    /** Für die gemeinsame Begrüßungsregel (Sie: Vor- und Nachname) */
    kunde?: KundeAnredeKontext | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const anredeKey = anrede === 'sie' ? 'sie' : 'du'
  const begruessung = esc(mailBegruessungZeile(anrede, data.name, data.kunde ?? null))
  // Beträge kommen brutto (bei §13b netto) — passend zum Hinweis „inkl. MwSt.“
  const istRange = data.gesamt_min !== data.gesamt_max
  const betragText = istRange
    ? `${formatEuroSpanne(data.gesamt_min, data.gesamt_max)}`
    : `${formatEuro(data.gesamt_min)}`
  const steuer = Math.round(data.lohn_gesamt * 0.2)
  const body1 = mailText(
    anrede,
    'anbei findest du dein Angebot — Details und Preise im PDF-Anhang:',
    'anbei finden Sie Ihr Angebot — Details und Preise im PDF-Anhang:'
  )
  const hint35a =
    !data.reverseCharge && data.lohn_gesamt > 0
      ? `<p style="font-size:15px;color:${C.gray500};margin:0 0 16px;line-height:1.6;">${mailText(
          anrede,
          `Hinweis: Als Privatperson kannst du den Lohnkostenanteil von <strong>${formatEuro(data.lohn_gesamt, { decimals: 0 })}</strong> nach § 35a EStG steuerlich absetzen (20 % = ${formatEuro(steuer, { decimals: 0 })}).`,
          `Hinweis: Als Privatperson können Sie den Lohnkostenanteil von <strong>${formatEuro(data.lohn_gesamt, { decimals: 0 })}</strong> nach § 35a EStG steuerlich absetzen (20 % = ${formatEuro(steuer, { decimals: 0 })}).`
        )}</p>`
      : ''
  const titel =
    data.titel?.trim() ||
    data.positionen[0]?.beschreibung?.trim() ||
    data.positionen[0]?.leistung?.trim() ||
    mailText(anrede, 'dein Projekt', 'Ihr Projekt')
  const mwstHint = data.reverseCharge ? 'netto · §13b UStG' : 'inkl. MwSt.'
  const summaryHtml = mailSummaryBlock({
    label: mailText(anrede, 'DEIN ANGEBOT', 'IHR ANGEBOT'),
    title: esc(titel),
    priceHtml: `<p style="font-size:16px;font-weight:700;color:${C.green};margin:0;">${esc(betragText)} <span style="font-size:12px;font-weight:400;color:${C.gray500};">${mwstHint}</span></p>`,
    metaHtml: `<p style="font-size:15px;color:${C.gray700};margin:8px 0 0;"><strong>Gültig bis:</strong> ${esc(data.gueltig_bis)}</p>`,
  })
  const disclaimer = mailText(
    anrede,
    'Du erhältst diese Mail, weil du ein Angebot von uns erhalten hast.',
    'Sie erhalten diese Mail, weil Sie ein Angebot von uns erhalten haben.'
  )
  const betreff = buildSubject({
    objekt: titel,
    ereignis: 'Angebot bereit',
  })
  return {
    betreff,
    html: mailHtmlBase(
      `<p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${begruessung}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${body1}</p>
      ${summaryHtml}
      ${hint35a}
      ${data.visualisierung_vorschau_url ? mailKiVisualisierungBlock(anredeKey, data.visualisierung_vorschau_url) : ''}
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${mailKundenContactLine(anredeKey, b.telefon)}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${mailKundenGruss(anredeKey)}</p>`,
      mailText(anrede, `Dein Angebot: ${betragText}`, `Ihr Angebot: ${betragText}`),
      b,
      disclaimer,
      mailKundenStandardOptions(anredeKey, data.statusLink)
    ),
  }
}

export function mailAuftragsbestaetigung(
  data: {
    name: string
    gewerke: string[]
    startDatum: string
    endDatum?: string | null
    statusLink: string
    anrede?: MailAnrede
    kundeTyp?: string | null
    leistungsumfang?: string
    bruttoSumme?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = mailBegruessungZeile(anrede, data.name)
  return buildAuftragsbestaetigungMail(
    {
      anrede,
      begruessung,
      gewerke: data.gewerke,
      leistungsumfang: data.leistungsumfang?.trim() || data.gewerke.join(', ') || 'Ihr Projekt',
      startDatum: data.startDatum,
      endDatum: data.endDatum,
      bruttoSumme: data.bruttoSumme,
      statusLink: data.statusLink,
    },
    b
  )
}

export function mailUpdateHinweis(
  data: {
    name: string
    statusLink: string
    anrede?: MailAnrede
    kundeTyp?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const body = mailText(
    anrede,
    'es gibt ein neues Update zu deinem Projekt.',
    'es gibt ein neues Update zu Ihrem Projekt.'
  )
  const betreff = buildSubject({
    ereignis: 'Projekt-Update',
  })
  return {
    betreff,
    html: mailHtmlBase(
      `<p>${begruessung}</p><p>${body}</p>${btn(mailText(anrede, 'Jetzt ansehen →', 'Jetzt ansehen →'), data.statusLink)}`,
      betreff,
      b,
      undefined,
      { anrede, statusLink: data.statusLink }
    ),
  }
}

export type MailProjektUpdateInput = {
  name: string
  statusLink: string
  projektTitel: string
  statusLabel: string
  phaseStepsHtml: string
  updateTitel: string
  updateText: string
  naechsterSchritt?: string | null
  /** true = nur Kurztext + Link (Fotos auf Status-Seite), weniger Spam-Risiko */
  minimalBody?: boolean
  fotoLinks?: string[]
  anrede?: MailAnrede
  kundeTyp?: string | null
}

export function mailProjektStatusUpdate(data: MailProjektUpdateInput, b: MailBranding): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const anredeKey = anrede === 'sie' ? 'sie' : 'du'
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const titel = esc(data.updateTitel)
  const text = esc(data.updateText.trim()).replace(/\n/g, '<br/>')
  const projekt = esc(data.projektTitel)
  const status = esc(data.statusLabel)
  const fotoCount = data.fotoLinks?.length ?? 0

  const intro = mailText(
    anrede,
    'es gibt ein neues Update zu deinem Projekt — kurz zur Übersicht:',
    'es gibt ein neues Update zu Ihrem Projekt — kurz zur Übersicht:'
  )

  const summaryHtml = mailSummaryBlock({
    label: mailText(anrede, 'PROJEKT-UPDATE', 'PROJEKT-UPDATE'),
    title: titel,
    metaHtml: `<p style="font-size:15px;color:${C.gray700};margin:8px 0 0;"><strong>Projekt:</strong> ${projekt}</p>
      <p style="font-size:15px;color:${C.gray700};margin:4px 0 0;"><strong>Stand:</strong> ${status}</p>`,
  })

  const detailHtml =
    !data.minimalBody && data.updateText.trim()
      ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${text}</p>`
      : ''

  const fotoHinweis =
    fotoCount > 0
      ? `<p style="font-size:15px;color:${C.gray500};margin:0 0 16px;line-height:1.5;">${mailText(
          anrede,
          `${fotoCount} Foto${fotoCount === 1 ? '' : 's'} im Update — Details und Bilder in MeinBärenwald.`,
          `${fotoCount} Foto${fotoCount === 1 ? '' : 's'} im Update — Details und Bilder in MeinBärenwald.`
        )}</p>`
      : ''

  const naechster = data.naechsterSchritt?.trim()
    ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>Nächster Schritt:</strong> ${esc(data.naechsterSchritt.trim())}</p>`
    : ''

  const disclaimer = mailText(
    anrede,
    'Du erhältst diese Mail, weil es ein neues Update zu deinem Projekt gibt.',
    'Sie erhalten diese Mail, weil es ein neues Update zu Ihrem Projekt gibt.'
  )

  return {
    betreff: buildSubject({
      objekt: data.projektTitel,
      ereignis: data.updateTitel.trim() || 'Projekt-Update',
    }),
    html: mailHtmlBase(
      `<p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${begruessung}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      ${detailHtml}
      ${fotoHinweis}
      ${naechster}
      <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${mailKundenContactLine(anredeKey, b.telefon)}</p>
      <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${mailKundenGruss(anredeKey)}</p>`,
      data.updateTitel,
      b,
      disclaimer,
      mailKundenStandardOptions(anredeKey, data.statusLink)
    ),
  }
}

export { buildRechnungMail, rechnungMailBetreff, rechnungKorrekturMailBetreff, type RechnungMailInput } from '@/lib/mail/rechnung-mail'

export {
  zahlungserinnerungBetreff,
  zahlungserinnerungZahlbarBis,
  type ZahlungserinnerungMailInput,
  type ZahlungserinnerungStufe,
} from '@/lib/mail/zahlungserinnerung-mail'

export function buildZahlungserinnerungMail(
  data: ZahlungserinnerungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const iban = data.iban || b.iban
  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const nr = esc(data.nummer)
  const faellig = esc(data.faelligAm)
  const zahlbarBis = esc(data.zahlbarBis)
  const offenerBetrag = data.offenerBetrag ?? data.brutto
  const offenFmt = formatEuro(offenerBetrag, { suffix: false })
  const geldFmt = (n: number) => formatEuro(n, { suffix: false })

  const stufeTitel = data.stufe === 1 ? 'Zahlungserinnerung' : '2. Zahlungserinnerung'

  const bereitsGezahlt = data.bereitsGezahlt?.filter((z) => z.brutto > 0) ?? []
  const hatAbschlagHinweis = bereitsGezahlt.length > 0

  const bereitsGezahltHtml = hatAbschlagHinweis
    ? `
      <div style="background:${C.gray100};border-radius:8px;padding:14px 16px;margin:0 0 16px;font-size:15px;border-left:4px solid ${C.green};">
        <p style="margin:0 0 8px;font-weight:700;color:${C.greenDark};">Bereits gezahlt (Abschlagsrechnungen)</p>
        <ul style="margin:0 0 10px;padding-left:20px;color:${C.gray700};">
          ${bereitsGezahlt
            .map(
              (z) =>
                `<li>${esc(z.label)}: <strong>${esc(geldFmt(z.brutto))} €</strong></li>`
            )
            .join('')}
        </ul>
        <p style="margin:0;color:${C.gray700};">Summe bereits gezahlt: <strong>${esc(geldFmt(data.bereitsGezahltBrutto ?? bereitsGezahlt.reduce((s, z) => s + z.brutto, 0)))} €</strong></p>
      </div>`
    : ''

  const einleitung =
    data.stufe === 1
      ? mailText(
          anrede,
          hatAbschlagHinweis
            ? `unsere Rechnung <strong>${nr}</strong> war am <strong>${faellig}</strong> fällig. Für diese Rechnung sind noch <strong>${offenFmt} €</strong> offen (siehe unten). Bereits geleistete Abschlagszahlungen sind berücksichtigt.`
            : `unsere Rechnung <strong>${nr}</strong> über <strong>${offenFmt} €</strong> war am <strong>${faellig}</strong> fällig und ist bei uns noch nicht eingegangen.`,
          hatAbschlagHinweis
            ? `unsere Rechnung <strong>${nr}</strong> war am <strong>${faellig}</strong> fällig. Für diese Rechnung sind noch <strong>${offenFmt} €</strong> offen (siehe unten). Bereits geleistete Abschlagszahlungen sind berücksichtigt.`
            : `unsere Rechnung <strong>${nr}</strong> über <strong>${offenFmt} €</strong> war am <strong>${faellig}</strong> fällig und ist bei uns noch nicht eingegangen.`
        )
      : mailText(
          anrede,
          hatAbschlagHinweis
            ? `trotz unserer ersten Zahlungserinnerung ist für die Rechnung <strong>${nr}</strong> noch <strong>${offenFmt} €</strong> offen. Bereits geleistete Abschlagszahlungen sind berücksichtigt.`
            : `trotz unserer ersten Zahlungserinnerung ist die Rechnung <strong>${nr}</strong> über <strong>${offenFmt} €</strong> noch offen.`,
          hatAbschlagHinweis
            ? `trotz unserer ersten Zahlungserinnerung ist für die Rechnung <strong>${nr}</strong> noch <strong>${offenFmt} €</strong> offen. Bereits geleistete Abschlagszahlungen sind berücksichtigt.`
            : `trotz unserer ersten Zahlungserinnerung ist die Rechnung <strong>${nr}</strong> über <strong>${offenFmt} €</strong> noch offen.`
        )

  const bitte =
    data.stufe === 1
      ? mailText(
          anrede,
          `Bitte überweise den offenen Betrag bis zum <strong>${zahlbarBis}</strong>. Die Rechnung findest du erneut im PDF-Anhang.`,
          `Bitte überweisen Sie den offenen Betrag bis zum <strong>${zahlbarBis}</strong>. Die Rechnung finden Sie erneut im PDF-Anhang.`
        )
      : mailText(
          anrede,
          `Wir bitten dich, den Betrag bis spätestens <strong>${zahlbarBis}</strong> zu überweisen. Die Rechnung liegt erneut als PDF bei.`,
          `Wir bitten Sie, den Betrag bis spätestens <strong>${zahlbarBis}</strong> zu überweisen. Die Rechnung liegt erneut als PDF bei.`
        )

  const bereits = mailText(
    anrede,
    `Falls du bereits überwiesen hast, melde dich bitte unter <a href="tel:${telHref}" style="color:${C.green};">${tel}</a>.`,
    `Falls Sie bereits überwiesen haben, melden Sie sich bitte unter <a href="tel:${telHref}" style="color:${C.green};">${tel}</a>.`
  )

  return {
    betreff: zahlungserinnerungBetreff(data.stufe, data.nummer, data.projektTitel),
    html: mailHtmlBase(
      `
      <h2 style="color:${C.green};margin:0 0 16px;">${stufeTitel}</h2>
      ${bereitsGezahltHtml}
      <p>${begruessung}</p>
      <p>${einleitung}</p>
      <p>${bitte}</p>
      <div style="background:${C.greenSoft};border-radius:8px;padding:14px 16px;margin:16px 0;font-size:15px;">
        <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:${C.green};padding:4px 0;width:50%;">Offener Betrag:</td><td style="font-weight:700;font-size:16px;color:${C.greenDark};">${offenFmt} €</td></tr>
        <tr><td style="color:${C.green};padding:4px 0;">Zahlbar bis:</td><td style="font-weight:600;color:${C.greenDark};"><strong>${zahlbarBis}</strong></td></tr>
        <tr><td style="color:${C.green};padding:4px 0;">IBAN:</td><td style="color:${C.greenDark};">${esc(iban)}</td></tr>
        <tr><td style="color:${C.green};padding:4px 0;">Verwendungszweck:</td><td style="color:${C.greenDark};">${nr}</td></tr>
        </table>
      </div>
      <p style="font-size:15px;color:${C.gray500};">${bereits}</p>
    `,
      `${stufeTitel}: ${offenFmt} € offen`,
      b,
      undefined,
      { anrede }
    ),
  }
}

export function mailZahlungserinnerung(
  data: {
    name: string
    nummer: string
    brutto: number
    faelligAm: string
    faelligAmIso?: string | null
    zahlbarBis?: string
    tageUeberfaellig: number
    stufe?: ZahlungserinnerungStufe
    iban: string
    anrede?: MailAnrede
    kundeTyp?: string | null
    offenerBetrag?: number
    bereitsGezahltBrutto?: number
    bereitsGezahlt?: Array<{ label: string; brutto: number; rechnungsnummer?: string }>
  },
  b: MailBranding
): { betreff: string; html: string } {
  const stufe = data.stufe ?? (data.tageUeberfaellig >= 21 ? 2 : 1)
  return buildZahlungserinnerungMail(
    {
      ...data,
      stufe,
      zahlbarBis: data.zahlbarBis ?? zahlungserinnerungZahlbarBis(data.faelligAmIso),
    },
    b
  )
}

export function mailHandwerkerAnfrage(
  data: {
    name: string
    gewerk: string
    plz: string
    zeitraum?: string | null
    positionen: { leistung?: string | null; beschreibung?: string | null; menge?: number; einheit?: string }[]
    link: string
    notiz?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const gw = esc(data.gewerk)
  const plz = esc(data.plz)
  const zt = data.zeitraum?.trim() || 'Nach Absprache'
  const posCount = data.positionen.length
  const posCards = data.positionen
    .map((p, i) => {
      const titel = esc(String(p.leistung ?? p.beschreibung ?? 'Position').trim())
      const beschr = String(p.beschreibung ?? '').trim()
      const leistung = String(p.leistung ?? '').trim()
      const beschrBlock =
        beschr && beschr !== leistung
          ? `<p style="margin:8px 0 0;font-size:15px;color:${C.gray600};line-height:1.5;">${esc(beschr).replace(/\n/g, '<br/>')}</p>`
          : ''
      const menge = p.menge && p.einheit ? `${p.menge} ${p.einheit}` : ''
      const mengeRow = menge
        ? `<tr><td style="color:${C.gray500};padding:4px 0;vertical-align:top;">Menge:</td><td style="font-weight:600;color:${C.greenDark};">${esc(menge)}</td></tr>`
        : ''
      return whiteBorderBox(`
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${C.green};text-transform:uppercase;">Position ${i + 1}${posCount > 1 ? ` von ${posCount}` : ''}</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:${C.greenDark};">${titel}</p>
        ${beschrBlock}
        ${mengeRow ? `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin-top:8px;">${mengeRow}</table>` : ''}
      `)
    })
    .join('')
  const notizBlock = data.notiz?.trim()
    ? `<p style="font-size:15px;line-height:1.6;margin:16px 0;"><strong>Hinweis von Bärenwald:</strong><br/>${esc(data.notiz.trim()).replace(/\n/g, '<br/>')}</p>`
    : ''
  const betreffSuffix =
    posCount > 1 ? `${data.gewerk} (${posCount} Positionen)` : data.gewerk
  return {
    betreff: buildPartnerSubject({
      gewerk: betreffSuffix,
      ort: data.plz.trim() || null,
      ereignis: 'Neue Anfrage',
    }),
    html: mailHtmlBase(
      `
      <h2 style="color:${C.green};margin:0 0 16px;">Neue Anfrage für Sie</h2>
      <p>Guten Tag ${name},</p>
      <p>wir haben eine neue Anfrage im Bereich <strong>${gw}</strong>${posCount > 1 ? ` mit <strong>${posCount} Positionen</strong>` : ''}.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
        <tr><td style="color:${C.green};padding:4px 0;width:40%;">Gewerk:</td><td style="font-weight:600;color:${C.greenDark};">${gw}</td></tr>
        <tr><td style="color:${C.green};padding:4px 0;">Einsatzort:</td><td style="font-weight:600;color:${C.greenDark};">${plz} München</td></tr>
        <tr><td style="color:${C.green};padding:4px 0;">Zeitraum:</td><td style="font-weight:600;color:${C.greenDark};">${esc(zt)}</td></tr>
        </table>
      `)}
      ${posCount > 0 ? `<div style="margin:16px 0;">${posCards}</div>` : ''}
      ${notizBlock}
      ${btn('Anfrage ansehen & antworten →', data.link)}
      <p style="font-size:15px;color:${C.gray500};">Link:<br/><a href="${esc(data.link)}" style="color:${C.green};word-break:break-all;">${esc(data.link)}</a></p>
    `,
      `Neue Anfrage: ${data.gewerk}`,
      b,
      undefined,
      { skipMeinBaerenwaldPs: true }
    ),
  }
}
