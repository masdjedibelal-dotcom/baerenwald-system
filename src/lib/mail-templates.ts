import type { MailBranding } from '@/lib/mail-branding'
import { mailLogoCidSrc, mailLogoInlineEnabled } from '@/lib/mail/mail-logo-inline'
import { resolveBrandLogoUrl, type BrandLogoVariant } from '@/lib/brand'
import { mailPrimaryButtonHtml, mailSecondaryButtonHtml } from '@/lib/mail/email-buttons'
import { buildPortalButton, buildPortalLoginLink } from '@/lib/portal-utils'
import { buildAuftragsbestaetigungMail } from '@/lib/mail/auftragsbestaetigung-mail'
import { mailKiVisualisierungBlock } from '@/lib/visualize/mail-block'
import { buildRechnungMail, type RechnungMailInput } from '@/lib/mail/rechnung-mail'
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
import { filterAdressRueckfragen, type VorOrtRueckfrage } from '@/lib/anfrage-adresse'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MAIL_MARKENNAME = 'Bärenwald'

function brandVariantForMail(variant: 'onDark' | 'onLight'): BrandLogoVariant {
  return variant === 'onLight' ? 'green' : 'white'
}

function usesCustomFirmLogoUrl(url: string, brandVariant: BrandLogoVariant): boolean {
  const u = url.trim()
  if (!u || !/^https?:\/\//i.test(u)) return false
  const defaults = [
    resolveBrandLogoUrl('green'),
    resolveBrandLogoUrl('white'),
    resolveBrandLogoUrl(brandVariant),
  ]
  return !defaults.includes(u)
}

/** Logo + Markenname „Bärenwald“ (grüner oder heller Kopf). */
export function mailLogoMitMarkenname(
  b: MailBranding,
  variant: 'onDark' | 'onLight' = 'onDark'
): string {
  const brandVariant = brandVariantForMail(variant)
  const logo =
    variant === 'onLight' ? (b.logoUrlOnLight?.trim() ?? '') : (b.logoUrl?.trim() ?? '')
  const textColor = variant === 'onLight' ? '#1A3D2B' : '#FFFFFF'
  const useInline =
    mailLogoInlineEnabled() && !usesCustomFirmLogoUrl(logo, brandVariant)
  const logoSrc = useInline ? mailLogoCidSrc(brandVariant) : logo
  const logoImg =
    logoSrc && (useInline || /^https?:\/\//i.test(logoSrc))
      ? `<img src="${useInline ? logoSrc : esc(logoSrc)}" width="36" height="36" alt="${esc(MAIL_MARKENNAME)}" style="display:block;width:36px;height:36px;border:0;"/>`
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
    <p style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${opts.label}</p>
    <p style="font-size:17px;font-weight:700;color:#111111;margin:0 0 6px;line-height:1.35;">${opts.title}</p>
    ${opts.priceHtml ?? ''}
    ${opts.metaHtml ?? ''}
  </div>`
}

export type MailHtmlBaseOptions = {
  /** Kunden-Mails: P.S. MeinBärenwald (Standard: an) */
  skipMeinBaerenwaldPs?: boolean
  anrede?: 'du' | 'sie'
  /** @deprecated Wird nicht mehr in Mails angezeigt (nur Portal-Login). */
  statusLink?: string | null
}

/** P.S.-Hinweis auf MeinBärenwald — Standard-Fuß in Kunden-Mails. */
export function mailMeinBaerenwaldPsFooter(opts: {
  anrede: 'du' | 'sie'
  portalLink?: string
}): string {
  const portal = opts.portalLink?.trim() || buildPortalLoginLink()
  const anrede = opts.anrede
  const text =
    anrede === 'du'
      ? 'In <strong>MeinBärenwald</strong> siehst du dein Projekt digital — Anfrage, Angebote, Dokumente, Bautagebuch und Updates jederzeit im Blick.'
      : 'In <strong>MeinBärenwald</strong> sehen Sie Ihr Projekt digital — Anfrage, Angebote, Dokumente, Bautagebuch und Updates jederzeit im Blick.'
  return `<div style="margin:28px 0 0;padding:16px 0 0;border-top:1px solid #E5E7EB;">
    <p style="font-size:13px;font-weight:700;color:#6B7280;margin:0 0 8px;letter-spacing:0.02em;">P.S.</p>
    <p style="font-size:14px;color:#374151;line-height:1.55;margin:0 0 12px;">${text}</p>
    ${buildPortalButton(portal, anrede)}
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
    ? `<p style="font-size:11px;color:#D1D5DB;margin:4px 0 0;line-height:1.5;">${esc(footerDisclaimer.trim())}</p>`
    : ''
  const psHtml =
    options?.skipMeinBaerenwaldPs === true
      ? ''
      : mailMeinBaerenwaldPsFooter({
          anrede: options?.anrede ?? 'du',
        })

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;">${pre}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;background:#ffffff;">
<table width="580" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;max-width:580px;width:100%;">
<tr>
  <td style="padding:0 0 24px;border-bottom:1px solid #E5E7EB;background:#ffffff;">
    ${logoBlock}
  </td>
</tr>
<tr>
  <td style="padding:32px 0 24px;background:#ffffff;">
    ${content}
    ${psHtml}
  </td>
</tr>
<tr>
  <td style="padding:20px 0 0;border-top:1px solid #E5E7EB;background:#ffffff;">
    <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.6;">
      ${esc(b.firmenname)} · ${websiteKurz} · <a href="tel:${telHref}" style="color:#9CA3AF;text-decoration:none;">${tel}</a>
    </p>
    ${disclaimerHtml}
  </td>
</tr>
</table>
</td></tr>
</table>
</body></html>`
}

function btn(text: string, url: string): string {
  return mailPrimaryButtonHtml(text, url)
}

function btnSecondary(text: string, url: string): string {
  return mailSecondaryButtonHtml(text, url)
}

function greenBox(html: string): string {
  return `<div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:16px 0;">${html}</div>`
}

function greenHintBox(html: string): string {
  return `<div style="background:#EAF3DE;border:1px solid #C5DDB0;border-radius:8px;padding:16px 20px;margin:16px 0;">${html}</div>`
}

function whiteBorderBox(html: string): string {
  return `<div style="background:#ffffff;border:1px solid #E5E7EB;border-radius:8px;padding:16px 20px;margin:12px 0;">${html}</div>`
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="color:#6B7280;padding:5px 0;width:36%;vertical-align:top;font-size:14px;">${esc(label)}:</td><td style="font-weight:600;color:#1F2937;font-size:14px;padding:5px 0;">${value}</td></tr>`
}

function mailTerminDetailsInline(datumFmt: string, zeitText: string, ort: string): string {
  const zeit = esc(zeitText.trim() || '—')
  return `<p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.7;">
    <strong>Datum:</strong> ${esc(datumFmt)}<br/>
    <strong>Uhrzeit:</strong> ${zeit}<br/>
    <strong>Ort:</strong> ${esc(ort.trim() || '—')}
  </p>`
}

function mailObjektbetreuerTelLink(telefon: string): string {
  const t = telefon.trim()
  if (!t) return ''
  return `<a href="tel:${esc(t.replace(/\s/g, ''))}" style="color:#2E7D52;font-weight:600;">${esc(t)}</a>`
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
  return `<p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;">${text}</p>`
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
      return `<li style="margin:0 0 4px;font-size:14px;color:#1A3D2B;line-height:1.45;">${esc(label)}</li>`
    })
    .join('')
  return `${greenHintBox(`
    <p style="margin:0 0 8px;font-size:14px;color:#1A3D2B;line-height:1.5;">${intro}</p>
    <ul style="margin:0;padding-left:18px;color:#1A3D2B;">${lis}</ul>
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
      ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.55;"><strong>Hinweis:</strong> ${esc(data.notiz).replace(/\n/g, '<br/>')}</p>`
      : ''
  const bestaetigung = mailText(
    anrede,
    'hiermit bestätigen wir deinen Vor-Ort-Termin:',
    'hiermit bestätigen wir Ihren Vor-Ort-Termin:'
  )
  const introBlock =
    data.introHtml?.trim() ||
    `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 6px;">${begruessung}</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 14px;">${bestaetigung}</p>`
  return {
    betreff: `Terminbestätigung: ${data.terminTitel} am ${data.datumFmt} — ${b.firmenname}`,
    html: mailHtmlBase(
      `
      ${introBlock}
      ${mailTerminDetailsInline(data.datumFmt, zeitAnzeige, ort)}
      ${mailVorOrtRueckfragenBlock(anrede, data.fehlendeRueckfragen ?? [])}
      ${data.kollege?.name?.trim() ? mailKollegeVorOrtBlock(anrede, data.kollege) : ''}
      ${notizBlock}
      <p style="font-size:15px;color:#374151;margin:20px 0 0;">${mailTeamGruss(anrede, b.firmenname)}</p>
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
  const f = (n: number) =>
    n.toLocaleString('de-DE', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
  if (a != null && b != null && a !== b) return `${f(a)} – ${f(b)} €`
  const x = a ?? b ?? 0
  return `${f(x)} €`
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
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const projektTitel = esc(anfrageProjektTitel(data.situation, data.bereiche, anrede))
  const ref = esc(data.anfrageRef.trim() || '—')
  const preis = formatPreisSpanne(data.preis_min, data.preis_max)
  const preisHtml = preis
    ? `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${esc(preis)}</p>`
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
      <h1 style="font-size:22px;font-weight:700;color:#111111;margin:0 0 20px;">${h1}</h1>
      <p style="font-size:15px;color:#374151;margin:0 0 8px;line-height:1.6;">${begruessung}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.6;">${einleitung}</p>
      ${mailSummaryBlock({
        label: summaryLabel,
        title: projektTitel,
        priceHtml: preisHtml,
      })}
      <p style="font-size:15px;color:#374151;margin:0 0 4px;line-height:1.6;">${abschluss}</p>
      <p style="font-size:15px;color:#374151;margin:16px 0 0;">${mailTeamGruss(anrede, b.firmenname)}</p>`

  const betreff = mailText(
    anrede,
    `Danke für deine Anfrage — ${b.firmenname}`,
    `Vielen Dank für Ihre Anfrage — ${b.firmenname}`
  )

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
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const istRange = data.gesamt_min !== data.gesamt_max
  const betragText = istRange
    ? `${data.gesamt_min.toLocaleString('de-DE')} – ${data.gesamt_max.toLocaleString('de-DE')} €`
    : `${data.gesamt_min.toLocaleString('de-DE')} €`
  const tel = esc(b.telefon)
  const rows = data.positionen
    .map((p) => {
      const txt = esc(String(p.beschreibung || p.leistung || 'Position').trim())
      const g = Number(p.gesamt_fix ?? p.gesamt_min ?? p.gesamt_max ?? 0)
      return `<tr style="border-bottom:1px solid #E2E8E2;">
        <td style="padding:8px 0;">${txt}</td>
        <td style="padding:8px 0;text-align:right;white-space:nowrap;color:#2E7D52;font-weight:500;">${g.toLocaleString('de-DE')} €</td>
      </tr>`
    })
    .join('')
  const steuer = Math.round(data.lohn_gesamt * 0.2)
  const h2 = mailText(anrede, 'Dein persönliches Angebot', 'Ihr persönliches Angebot')
  const body1 = mailText(
    anrede,
    'anbei findest du dein Angebot. Das detaillierte Dokument findest du im Anhang.',
    'anbei finden Sie Ihr Angebot. Das detaillierte Dokument finden Sie im Anhang.'
  )
  const hint35a =
    anrede === 'du' && data.lohn_gesamt > 0
      ? `<p style="font-size:13px;color:#6B7280;">Hinweis: Als Privatperson kannst du den Lohnkostenanteil von <strong>${data.lohn_gesamt.toLocaleString('de-DE')} €</strong> nach § 35a EStG steuerlich absetzen (20 % = ${steuer.toLocaleString('de-DE')} €).</p>`
      : anrede === 'sie' && data.lohn_gesamt > 0
        ? `<p style="font-size:13px;color:#6B7280;">Hinweis: Als Privatperson können Sie den Lohnkostenanteil von <strong>${data.lohn_gesamt.toLocaleString('de-DE')} €</strong> nach § 35a EStG steuerlich absetzen (20 % = ${steuer.toLocaleString('de-DE')} €).</p>`
        : ''
  const gueltig = mailText(
    anrede,
    `Gültig bis: <strong>${esc(data.gueltig_bis)}</strong>`,
    `Gültig bis: <strong>${esc(data.gueltig_bis)}</strong>`
  )
  const fragen = mailText(
    anrede,
    `Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a>`,
    `Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a>`
  )
  const betreff = mailText(
    anrede,
    'Dein Angebot von Bärenwald München',
    'Ihr Angebot von Bärenwald München'
  )
  return {
    betreff,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">${h2}</h2>
      <p>${begruessung}</p>
      <p>${body1}</p>
      ${greenBox(`
        <p style="margin:0;font-size:12px;color:#2E7D52;">Gesamtbetrag inkl. MwSt.</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1A3D2B;">${esc(betragText)}</p>
      `)}
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">${rows}</table>
      ${hint35a}
      ${data.visualisierung_vorschau_url ? mailKiVisualisierungBlock(anrede, data.visualisierung_vorschau_url) : ''}
      <p style="font-size:13px;color:#6B7280;">${gueltig}</p>
      ${btn(mailText(anrede, 'Projektstatus ansehen →', 'Projektstatus ansehen →'), data.statusLink)}
      <p>${fragen}</p>
    `,
      mailText(anrede, `Dein Angebot: ${betragText}`, `Ihr Angebot: ${betragText}`),
      b,
      undefined,
      { anrede, statusLink: data.statusLink }
    ),
  }
}

/** Kurz-Mail mit Angebotsnr. und PDF-Anhang (kompaktes Kundenlayout). */
export function mailAngebotPdfUebersicht(
  data: {
    name: string
    angebotsnr: string
    leistungsumfang: string
    gesamtBruttoFmt: string
    gueltig_bis: string
    dokument_typ?: 'einfach' | 'projekt'
    projektbeschreibung_teaser?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const adr = esc(b.adresseZeile)
  const teaserRaw = data.projektbeschreibung_teaser?.trim() ?? ''
  const teaser =
    data.dokument_typ === 'projekt' && teaserRaw
      ? `<p style="color:#374151;font-size:13px;line-height:1.6;margin-top:8px;">${esc(teaserRaw.length > 280 ? `${teaserRaw.slice(0, 277)}…` : teaserRaw)}</p>`
      : ''
  return {
    betreff: `Ihr Angebot von ${b.firmenname} — ${data.angebotsnr}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:white;">
  <div style="background:#1A3D2B;padding:24px;text-align:center;">
    <h1 style="color:white;font-size:20px;margin:0;">${esc(b.firmenname)}</h1>
    <p style="color:#A8C5A0;margin:4px 0 0;font-size:13px;">Ihr persönliches Angebot</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="font-size:15px;color:#1A3D2B;">Sehr geehrte/r ${name},</p>
    <br/>
    <p style="color:#374151;line-height:1.7;">
      vielen Dank für Ihr Vertrauen. Im Anhang finden Sie Ihr Angebot als PDF.
    </p>
    <br/>
    <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="font-weight:bold;color:#1A3D2B;margin-bottom:8px;">Angebotsübersicht</p>
      <p style="color:#374151;font-size:13px;">Angebotsnr.: <strong>${esc(data.angebotsnr)}</strong></p>
      <p style="color:#374151;font-size:13px;">Leistung: ${esc(data.leistungsumfang || '—')}</p>
      ${teaser}
      <p style="color:#1A3D2B;font-weight:bold;font-size:15px;margin-top:8px;">
        Gesamtbetrag: ${esc(data.gesamtBruttoFmt)} inkl. MwSt.
      </p>
      <p style="color:#6B7280;font-size:12px;margin-top:8px;">Gültig bis: ${esc(data.gueltig_bis)}</p>
    </div>
    <p style="color:#374151;line-height:1.7;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    <br/>
    <div style="text-align:center;margin:24px 0;">
      ${mailPrimaryButtonHtml('Jetzt anrufen →', `tel:${telHref}`, { margin: '0', size: 'sm' })}
    </div>
    <p style="color:#374151;line-height:1.7;">
      Mit freundlichen Grüßen<br/>
      <strong>Ihr ${esc(b.firmenname)}-Team</strong>
    </p>
    ${mailMeinBaerenwaldPsFooter({ anrede: 'sie' })}
  </div>
  <div style="background:#F3F4F6;padding:16px 24px;font-size:11px;color:#6B7280;text-align:center;">
    ${esc(b.firmenname)} · ${adr}<br/>
    Tel.: ${tel}
  </div>
</div>`,
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

export function mailAngebotAnnahmeBestaetigung(
  data: {
    name: string
    anrede: 'du' | 'sie'
    zeilen: Array<{ gewerk: string; leistung: string; preis: string }>
    zeitraum: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const intro =
    data.anrede === 'du'
      ? 'vielen Dank für die Bestätigung deines Auftrags. Hier ist die kurze Zusammenfassung:'
      : 'vielen Dank für die Bestätigung Ihres Auftrags. Hier ist die kurze Zusammenfassung:'
  const gruss =
    data.anrede === 'du'
      ? 'Viele Grüße<br/><strong>Dein Bärenwald Team</strong>'
      : 'Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>'

  const zeilenHtml = data.zeilen
    .map(
      (z) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;color:#1F2937;">${esc(z.gewerk)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;color:#374151;">${esc(z.leistung)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;color:#1A3D2B;text-align:right;font-weight:600;">${esc(z.preis)}</td>
      </tr>`
    )
    .join('')

  const begruessung = esc(mailBegruessungZeile(data.anrede, data.name))
  const betreff = mailText(
    data.anrede,
    'Bestätigung deines Auftrags — Bärenwald München',
    'Bestätigung Ihres Auftrags — Bärenwald München'
  )
  return {
    betreff,
    html: mailHtmlBase(
      `
      <p>${begruessung}</p>
      <p>${intro}</p>
      <p style="margin:14px 0 6px;color:#111827;"><strong>Umsetzungszeitraum:</strong> ${esc(data.zeitraum)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:8px 0 16px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:1px solid #D1D5DB;color:#6B7280;font-size:12px;">Gewerk</th>
            <th style="text-align:left;padding:8px 0;border-bottom:1px solid #D1D5DB;color:#6B7280;font-size:12px;">Leistung</th>
            <th style="text-align:right;padding:8px 0;border-bottom:1px solid #D1D5DB;color:#6B7280;font-size:12px;">Preis</th>
          </tr>
        </thead>
        <tbody>${zeilenHtml}</tbody>
      </table>
      <p>${gruss}</p>
    `,
      'Bestätigung Ihres Auftrags',
      b,
      undefined,
      { anrede: data.anrede }
    ),
  }
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
  const betreff = mailText(
    anrede,
    'Neues Update zu deinem Projekt',
    'Neues Update zu Ihrem Projekt'
  )
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
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const titel = esc(data.updateTitel)
  const text = esc(data.updateText.trim()).replace(/\n/g, '<br/>')
  const projekt = esc(data.projektTitel)
  const status = esc(data.statusLabel)

  const fotoBlock =
    !data.minimalBody && (data.fotoLinks?.length ?? 0) > 0
      ? `<p style="font-size:13px;color:#6B7280;margin:16px 0 8px;">Fortschrittsfotos (${data.fotoLinks!.length}):</p>
         <p style="font-size:13px;line-height:1.8;">${data.fotoLinks!.map((u) => `<a href="${esc(u)}" style="color:#2E7D52;">Foto ansehen</a>`).join(' · ')}</p>
         <p style="font-size:12px;color:#9CA3AF;margin-top:8px;">${mailText(anrede, 'Alle Bilder findest du auch auf deiner Projekt-Statusseite.', 'Alle Bilder finden Sie auch auf Ihrer Projekt-Statusseite.')}</p>`
      : data.minimalBody && (data.fotoLinks?.length ?? 0) > 0
        ? `<p style="font-size:13px;color:#6B7280;margin:12px 0;">${mailText(anrede, 'Neue Fotos und Details findest du auf deiner Projekt-Statusseite.', 'Neue Fotos und Details finden Sie auf Ihrer Projekt-Statusseite.')}</p>`
        : ''

  const bodyBlock = data.minimalBody
    ? `<p style="font-size:15px;color:#374151;margin:0 0 16px;">${mailText(anrede, 'Es gibt ein neues Update zu deinem Projekt.', 'Es gibt ein neues Update zu Ihrem Projekt.')}</p>`
    : `<div style="background:#F7F6F3;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1A3D2B;">${titel}</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${text}</p>
      </div>`

  const naechster = data.naechsterSchritt?.trim()
    ? `<p style="font-size:13px;color:#374151;margin:16px 0 0;"><strong>Nächster Schritt:</strong> ${esc(data.naechsterSchritt.trim())}</p>`
    : ''

  return {
    betreff: `Projekt-Update: ${data.updateTitel} — Bärenwald München`,
    html: mailHtmlBase(
      `
      <p>${begruessung}</p>
      <p style="font-size:14px;color:#6B7280;margin:0 0 4px;">${projekt}</p>
      <p style="font-size:13px;color:#2E7D52;font-weight:600;margin:0 0 8px;">${mailText(anrede, 'Aktueller Stand:', 'Aktueller Stand:')} ${status}</p>
      ${data.phaseStepsHtml}
      ${bodyBlock}
      ${fotoBlock}
      ${naechster}
      ${btn(mailText(anrede, 'Projekt-Status ansehen →', 'Projekt-Status ansehen →'), data.statusLink)}
      <p style="font-size:12px;color:#9CA3AF;margin-top:16px;">${mailText(anrede, 'Diese E-Mail enthält eine Zusammenfassung — alle Details und Bilder sind jederzeit online abrufbar.', 'Diese E-Mail enthält eine Zusammenfassung — alle Details und Bilder sind jederzeit online abrufbar.')}</p>
    `,
      data.updateTitel,
      b,
      undefined,
      { anrede, statusLink: data.statusLink }
    ),
  }
}

export function mailNachtrag(
  data: {
    name: string
    grund: string
    positionen: PosRow[]
    gesamt_min: number
    gesamt_max: number
    bestaetigungsLink: string
    anrede?: MailAnrede
    kundeTyp?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const betrag =
    data.gesamt_min === data.gesamt_max
      ? `${data.gesamt_min.toLocaleString('de-DE')} €`
      : `${data.gesamt_min.toLocaleString('de-DE')} – ${data.gesamt_max.toLocaleString('de-DE')} €`
  const tel = esc(b.telefon)
  const rows = data.positionen
    .map((p) => {
      const txt = esc(String(p.beschreibung || p.leistung || '').trim())
      const g = Number(p.gesamt_fix ?? p.gesamt_min ?? 0)
      return `<tr style="border-bottom:1px solid #E2E8E2;"><td style="padding:8px 0;">${txt}</td><td style="padding:8px 0;text-align:right;">${g.toLocaleString('de-DE')} €</td></tr>`
    })
    .join('')
  const betreff = mailText(
    anrede,
    'Nachtrag zu deinem Auftrag — Bärenwald München',
    'Nachtrag zu Ihrem Auftrag — Bärenwald München'
  )
  const h2 = mailText(anrede, 'Nachtrag zu deinem Auftrag', 'Nachtrag zu Ihrem Auftrag')
  const body = mailText(
    anrede,
    'bei den laufenden Arbeiten ist ein Zusatzaufwand entstanden, den wir dir transparent mitteilen.',
    'bei den laufenden Arbeiten ist ein Zusatzaufwand entstanden, den wir Ihnen transparent mitteilen.'
  )
  return {
    betreff,
    html: mailHtmlBase(
      `
      <h2 style="color:#C4922A;margin:0 0 16px;">${h2}</h2>
      <p>${begruessung}</p>
      <p>${body}</p>
      <div style="background:#FEF3E3;border-radius:8px;padding:14px 16px;margin:16px 0;"><p style="margin:0;font-weight:600;">Grund: ${esc(data.grund)}</p></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">${rows}</table>
      ${greenBox(`
        <p style="margin:0;font-size:12px;color:#2E7D52;">Mehrkosten gesamt</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1A3D2B;">+ ${esc(betrag)}</p>
      `)}
      ${btn(mailText(anrede, 'Nachtrag bestätigen →', 'Nachtrag bestätigen →'), data.bestaetigungsLink)}
      <p style="font-size:13px;color:#6B7280;">${mailText(anrede, 'Bei Fragen:', 'Bei Fragen:')} <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Nachtrag: +${betrag}`,
      b,
      undefined,
      { anrede, statusLink: data.bestaetigungsLink }
    ),
  }
}

export function mailAbnahme(
  data: {
    name: string
    gewerke: string[]
    abnahmeDatum: string
    anrede?: MailAnrede
    kundeTyp?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = resolveMailAnrede(data.anrede, data.kundeTyp)
  const begruessung = esc(mailBegruessungZeile(anrede, data.name))
  const gw = esc(data.gewerke.join(', '))
  const tel = esc(b.telefon)
  const h2 = mailText(anrede, 'Dein Projekt ist abgeschlossen', 'Ihr Projekt ist abgeschlossen')
  const body1 = mailText(
    anrede,
    'alle Arbeiten wurden erfolgreich abgeschlossen und abgenommen.',
    'alle Arbeiten wurden erfolgreich abgeschlossen und abgenommen.'
  )
  const proto = mailText(
    anrede,
    'Das Abnahmeprotokoll mit der vollständigen Dokumentation findest du im Anhang.',
    'Das Abnahmeprotokoll mit der vollständigen Dokumentation finden Sie im Anhang.'
  )
  const danke = mailText(anrede, 'Vielen Dank für dein Vertrauen!', 'Vielen Dank für Ihr Vertrauen!')
  const betreff = mailText(
    anrede,
    'Dein Projekt ist abgeschlossen — Bärenwald München',
    'Ihr Projekt ist abgeschlossen — Bärenwald München'
  )
  return {
    betreff,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">${h2}</h2>
      <p>${begruessung}</p>
      <p>${body1}</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:40%;">Abnahmedatum:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${esc(data.abnahmeDatum)}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Gewerke:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${gw}</td></tr>
        </table>
      `)}
      <p>${proto}</p>
      <p style="font-size:13px;color:#6B7280;"><strong>Gewährleistung:</strong> Die gesetzliche Gewährleistung beträgt 5 Jahre ab Abnahme.</p>
      <p>${danke}</p>
      <p><a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      h2,
      b,
      undefined,
      { anrede }
    ),
  }
}

export { buildRechnungMail, rechnungMailBetreff, type RechnungMailInput } from '@/lib/mail/rechnung-mail'

export function mailRechnung(data: RechnungMailInput, b: MailBranding) {
  return buildRechnungMail(data, b)
}

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
  const bruttoFmt = data.brutto.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const stufeTitel = data.stufe === 1 ? 'Zahlungserinnerung' : '2. Zahlungserinnerung'

  const einleitung =
    data.stufe === 1
      ? mailText(
          anrede,
          `unsere Rechnung <strong>${nr}</strong> über <strong>${bruttoFmt} €</strong> war am <strong>${faellig}</strong> fällig und ist bei uns noch nicht eingegangen.`,
          `unsere Rechnung <strong>${nr}</strong> über <strong>${bruttoFmt} €</strong> war am <strong>${faellig}</strong> fällig und ist bei uns noch nicht eingegangen.`
        )
      : mailText(
          anrede,
          `trotz unserer ersten Zahlungserinnerung ist die Rechnung <strong>${nr}</strong> über <strong>${bruttoFmt} €</strong> noch offen.`,
          `trotz unserer ersten Zahlungserinnerung ist die Rechnung <strong>${nr}</strong> über <strong>${bruttoFmt} €</strong> noch offen.`
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
    `Falls du bereits überwiesen hast, melde dich bitte unter <a href="tel:${telHref}" style="color:#2E7D52;">${tel}</a>.`,
    `Falls Sie bereits überwiesen haben, melden Sie sich bitte unter <a href="tel:${telHref}" style="color:#2E7D52;">${tel}</a>.`
  )

  return {
    betreff: zahlungserinnerungBetreff(data.stufe, data.nummer),
    html: mailHtmlBase(
      `
      <h2 style="color:#C4922A;margin:0 0 16px;">${stufeTitel}</h2>
      <p>${begruessung}</p>
      <p>${einleitung}</p>
      <p>${bitte}</p>
      <div style="background:#FEF3E3;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:#C4922A;padding:4px 0;width:50%;">Offener Betrag:</td><td style="font-weight:700;font-size:16px;">${bruttoFmt} €</td></tr>
        <tr><td style="color:#C4922A;padding:4px 0;">Zahlbar bis:</td><td><strong>${zahlbarBis}</strong></td></tr>
        <tr><td style="color:#C4922A;padding:4px 0;">IBAN:</td><td>${esc(iban)}</td></tr>
        <tr><td style="color:#C4922A;padding:4px 0;">Verwendungszweck:</td><td>${nr}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#6B7280;">${bereits}</p>
    `,
      `${stufeTitel}: ${bruttoFmt} € offen`,
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

export function mailHandwerkerLeistungZuweisung(
  data: {
    name: string
    plz: string
    leistungen: {
      gewerk_name: string
      leistung_name: string
      beschreibung?: string | null
      von_bis: string
    }[]
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const plz = esc(data.plz.trim() || '—')
  const cards = data.leistungen
    .map((l) => {
      const beschreibung = l.beschreibung?.trim() ? esc(l.beschreibung.trim()) : '—'
      return whiteBorderBox(`
        <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow('Gewerk', esc(l.gewerk_name))}
        ${detailRow('Leistung', esc(l.leistung_name))}
        ${detailRow('Beschreibung', beschreibung)}
        ${detailRow('Von – bis', esc(l.von_bis))}
        ${detailRow('PLZ', plz)}
        </table>
      `)
    })
    .join('')
  const subjectLeistung =
    data.leistungen.length === 1 ? data.leistungen[0]!.leistung_name : `${data.leistungen.length} Leistungen`

  return {
    betreff: `Leistungsanfrage: ${subjectLeistung} — Bärenwald Partner`,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Neue Leistungsanfrage</h2>
      <p style="margin:0 0 16px;">Guten Tag ${name},</p>
      ${cards}
      ${btnSecondary('Zum Partner-Portal →', data.portalLink)}
    `,
      `Leistungsanfrage: ${subjectLeistung}`,
      b,
      undefined,
      { skipMeinBaerenwaldPs: true }
    ),
  }
}

export function mailHandwerkerProjektvertragBereit(
  data: {
    name: string
    auftragTitel: string
    gewerkName: string
    vertragsNr: string
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const titel = esc(data.auftragTitel.trim() || 'Ihr Auftrag')
  const gewerk = esc(data.gewerkName.trim() || '—')
  const nr = esc(data.vertragsNr.trim() || '—')

  return {
    betreff: `Projektvertrag bereit — bitte bestätigen · Bärenwald Partner`,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Projektvertrag liegt bereit</h2>
      <p style="margin:0 0 16px;">Guten Tag ${name},</p>
      <p style="margin:0 0 16px;line-height:1.6;">
        Ihr Angebot wurde übernommen. Der <strong>Projekt-Nachunternehmervertrag</strong> steht im Partner-Portal bereit —
        bitte prüfen Sie die Unterlagen-Checkliste und bestätigen Sie den Vertrag verbindlich.
      </p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        ${detailRow('Auftrag', titel)}
        ${detailRow('Gewerk', gewerk)}
        ${detailRow('Vertrags-Nr.', nr)}
        </table>
      `)}
      <p style="margin:16px 0 8px;font-size:14px;font-weight:600;color:#1A3D2B;">Nächste Schritte im Portal:</p>
      <ol style="font-size:14px;line-height:1.75;padding-left:20px;margin:0 0 20px;color:#374151;">
        <li>Projektvertrag lesen und prüfen</li>
        <li>Pflicht-Unterlagen laut Checkliste hochladen (falls noch offen)</li>
        <li>Vertrag verbindlich bestätigen</li>
      </ol>
      <p style="font-size:13px;color:#6B7280;margin:0 0 16px;line-height:1.6;">
        Erst nach Ihrer Bestätigung wird der Auftrag für Sie freigeschaltet.
      </p>
      ${btnSecondary('Zum Partner-Portal →', data.portalLink)}
      <p style="font-size:13px;color:#6B7280;margin:16px 0 0;">Link:<br/>
        <a href="${esc(data.portalLink)}" style="color:#2E7D52;word-break:break-all;">${esc(data.portalLink)}</a>
      </p>
    `,
      `Projektvertrag bereit — ${data.gewerkName || 'Auftrag'}`,
      b,
      undefined,
      { skipMeinBaerenwaldPs: true }
    ),
  }
}

export function mailHandwerkerAnfrage(
  data: {
    name: string
    gewerk: string
    plz: string
    zeitraum?: string | null
    positionen: { beschreibung?: string | null }[]
    link: string
    notiz?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const gw = esc(data.gewerk)
  const plz = esc(data.plz)
  const zt = data.zeitraum?.trim() || 'Nach Absprache'
  const lis = data.positionen.map((p) => `<li>${esc(String(p.beschreibung ?? '').trim())}</li>`).join('')
  const notizBlock = data.notiz?.trim()
    ? `<p style="font-size:14px;line-height:1.6;margin:16px 0;"><strong>Hinweis von Bärenwald:</strong><br/>${esc(data.notiz.trim()).replace(/\n/g, '<br/>')}</p>`
    : ''
  return {
    betreff: `Neue Anfrage: ${data.gewerk} — Bärenwald München`,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Neue Anfrage für Sie</h2>
      <p>Guten Tag ${name},</p>
      <p>wir haben eine neue Anfrage im Bereich <strong>${gw}</strong>.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:40%;">Gewerk:</td><td style="font-weight:600;color:#1A3D2B;">${gw}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Einsatzort:</td><td style="font-weight:600;color:#1A3D2B;">${plz} München</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Zeitraum:</td><td style="font-weight:600;color:#1A3D2B;">${esc(zt)}</td></tr>
        </table>
      `)}
      <ul style="font-size:14px;line-height:1.8;padding-left:20px;margin:16px 0;">${lis}</ul>
      ${notizBlock}
      ${btn('Anfrage ansehen & antworten →', data.link)}
      <p style="font-size:13px;color:#6B7280;">Link:<br/><a href="${esc(data.link)}" style="color:#2E7D52;word-break:break-all;">${esc(data.link)}</a></p>
    `,
      `Neue Anfrage: ${data.gewerk}`,
      b,
      undefined,
      { skipMeinBaerenwaldPs: true }
    ),
  }
}

export function mailAbschlussdokumentation(
  data: { name: string; anrede: 'du' | 'sie'; nachricht: string },
  _b: MailBranding
): { betreff: string; htmlBody: string } {
  const projekt = data.anrede === 'du' ? 'dein Projekt' : 'Ihr Projekt'
  return {
    betreff: 'Abschlussdokumentation — Bärenwald München',
    htmlBody: `<p>anbei erhalten Sie die Abschlussdokumentation zu ${projekt}.</p>
      <p style="font-size:13px;color:#6B7280;">Das PDF enthält eine Zusammenfassung aller durchgeführten Arbeiten, Dokumentation und Fotos.</p>
      <p>Vielen Dank für Ihr Vertrauen!</p>`,
  }
}

export function mailHandwerkerFormular(
  data: { name: string; tabName: string; auftragName: string; adresse?: string | null; link: string },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const tel = esc(b.telefon)
  const adr = data.adresse?.trim() ? ` · ${esc(data.adresse.trim())}` : ''
  return {
    betreff: `Formular: ${data.tabName} — ${data.auftragName}`,
    html: mailHtmlBase(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Formular zum Ausfüllen</h2>
      <p>Guten Tag ${name},</p>
      <p>bitte füllen Sie das folgende Formular aus:</p>
      ${greenBox(`
        <p style="margin:0;font-size:15px;font-weight:600;color:#1A3D2B;">${esc(data.tabName)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#2E7D52;">${esc(data.auftragName)}${adr}</p>
      `)}
      ${btn('Formular öffnen →', data.link)}
      <p style="font-size:13px;color:#6B7280;">Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Formular: ${data.tabName}`,
      b,
      undefined,
      { skipMeinBaerenwaldPs: true }
    ),
  }
}
