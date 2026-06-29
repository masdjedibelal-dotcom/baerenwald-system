import type { KundeAnredeKontext } from '@/lib/kunde-rechnungsempfaenger'
import { kundeAngebotBegruessung } from '@/lib/kunde-rechnungsempfaenger'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import type { MailBranding } from '@/lib/mail-branding'
import {
  mailHtmlBase,
  mailKundenContactLine,
  mailKundenGruss,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { mailKiVisualisierungBlock } from '@/lib/visualize/mail-block'
import type { PortalMailAudience } from '@/lib/portal-utils'

export type AngebotMailAnrede = 'du' | 'sie'

/**
 * Anrede aus wizard_meta in notizen; sonst automatisch aus Kundentyp (Privat → du, Gewerbe → sie).
 */
export function parseAngebotAnrede(
  notizen?: string | null,
  kundeTyp?: string | null
): AngebotMailAnrede {
  try {
    const j = JSON.parse(notizen ?? '{}') as { wizard_meta?: { anrede?: string } }
    if (j.wizard_meta?.anrede === 'sie') return 'sie'
    if (j.wizard_meta?.anrede === 'du') return 'du'
  } catch {
    /* leer / kein JSON */
  }
  return mailAnredeFromKundeTyp(kundeTyp)
}

export function parseWizardMetaFromNotizen(
  notizen: string | null | undefined
): {
  einleitung?: string
  schluss?: string
  leistungsumfang?: string
  hinweise?: string
  anrede?: AngebotMailAnrede
} | null {
  try {
    const j = JSON.parse(notizen ?? '{}') as {
      wizard_meta?: {
        einleitung?: string
        schluss?: string
        leistungsumfang?: string
        hinweise?: string
        anrede?: string
      }
    }
    const wm = j.wizard_meta
    if (!wm) return null
    return {
      einleitung: wm.einleitung,
      schluss: wm.schluss,
      leistungsumfang: wm.leistungsumfang,
      hinweise: wm.hinweise,
      anrede: wm.anrede === 'sie' ? 'sie' : wm.anrede === 'du' ? 'du' : undefined,
    }
  } catch {
    return null
  }
}

export type AngebotMailInput = KundeAnredeKontext & {
  angebotsnr: string
  leistungsumfang: string
  gesamt_brutto: number
  gueltig_bis: string
  anrede: AngebotMailAnrede
  /** Leer = Standardtext Du/Sie in der Mail */
  einleitung?: string
  /** Leer = Standard-Schluss in der Mail */
  schluss?: string
  /** Angebot wurde bereits einmal versendet — korrigierte Fassung */
  istKorrektur?: boolean
  /** Link zu /portal/login */
  portalLink?: string
  /** Steuert P.S.-Text und Button-Label (MeinBärenwald vs. Auftraggeber-Portal). */
  portalAudience?: PortalMailAudience
  /** Vorschau-Bild KI-Visualisierung (wenn ins Angebot) */
  visualisierung_vorschau_url?: string | null
}

/** Platzhalter / Standard, wenn Felder in Schritt 2 leer bleiben */
export const ANGEBOT_MAIL_EINLEITUNG_STANDARD = {
  du: 'anbei findest du dein persönliches Angebot — Details und Preise im PDF-Anhang.',
  sie: 'anbei finden Sie Ihr persönliches Angebot — Details und Preise im PDF-Anhang.',
} as const

/** Hinweis Annahme / Unterzeichnung — PDF und E-Mail */
export const ANGEBOT_ANNAHME_HINWEIS = {
  du: 'Wenn das Angebot für dich passt, unterzeichne es bitte und sende es uns zurück — oder antworte einfach auf unsere E-Mail.',
  sie: 'Wenn das Angebot für Sie passt, unterzeichnen Sie es bitte und senden Sie es uns zurück — oder antworten Sie einfach auf unsere E-Mail.',
} as const

export const ANGEBOT_MAIL_SCHLUSS_STANDARD = {
  du: `${ANGEBOT_ANNAHME_HINWEIS.du}\n\nWir freuen uns von dir zu hören.\n\nViele Grüße\nDein Bärenwald Team`,
  sie: `${ANGEBOT_ANNAHME_HINWEIS.sie}\n\nWir freuen uns auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen\nIhr Bärenwald Team`,
} as const

/** Standard-Einleitung (Fließtext nach „Hallo …“) — in Schritt 2 vorausgefüllt und in der Vorschau sichtbar. */
export function defaultAngebotEinleitungText(
  anrede: AngebotMailAnrede,
  leistungsumfang: string
): string {
  const lu = leistungsumfang.trim() || 'Ihr Projekt'
  if (anrede === 'du') {
    return `anbei findest du dein persönliches Angebot für ${lu}. Schau es dir in Ruhe an und melde dich gerne bei uns, wenn du Fragen hast oder einen Termin vereinbaren möchtest.`
  }
  return `anbei finden Sie Ihr persönliches Angebot für ${lu}. Bitte nehmen Sie sich die Zeit, es in Ruhe zu prüfen. Bei Fragen stehen wir Ihnen gerne zur Verfügung.`
}

export function defaultAngebotSchlussText(anrede: AngebotMailAnrede): string {
  return ANGEBOT_MAIL_SCHLUSS_STANDARD[anrede]
}

export function angebotKorrekturEinleitungPrefix(anrede: AngebotMailAnrede): string {
  if (anrede === 'du') {
    return 'wir haben dein Angebot angepasst und senden dir hiermit die korrigierte Fassung zu.'
  }
  return 'wir haben Ihr Angebot angepasst und senden Ihnen hiermit die korrigierte Fassung zu.'
}

/** Noch Standard- oder Kurztext / leer — dann bei Anrede-Wechsel mit neuem Standard überschreiben. */
export function isDefaultAngebotEinleitung(text: string, leistungsumfang: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t === ANGEBOT_MAIL_EINLEITUNG_STANDARD.du || t === ANGEBOT_MAIL_EINLEITUNG_STANDARD.sie) {
    return true
  }
  const variants = new Set<string>()
  for (const a of ['du', 'sie'] as const) {
    variants.add(defaultAngebotEinleitungText(a, leistungsumfang).trim())
    variants.add(defaultAngebotEinleitungText(a, 'Ihr Projekt').trim())
  }
  return variants.has(t)
}

export function isDefaultAngebotSchluss(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t === ANGEBOT_MAIL_SCHLUSS_STANDARD.du.trim() || t === ANGEBOT_MAIL_SCHLUSS_STANDARD.sie.trim()) {
    return true
  }
  const teamDu = 'Dein Bärenwald München Team'
  const teamSie = 'Ihr Bärenwald München Team'
  return (
    t === 'Wir freuen uns von dir zu hören.\n\nViele Grüße\nDein Bärenwald Team' ||
    t === 'Wir freuen uns auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen\nIhr Bärenwald Team' ||
    t === 'Wir freuen uns auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen,\nBärenwald München' ||
    t === defaultAngebotPdfSchlusstext('du', teamDu).trim() ||
    t === defaultAngebotPdfSchlusstext('sie', teamSie).trim() ||
    t === 'Mit freundlichen Grüßen\nDein Bärenwald München Team' ||
    t === 'Mit freundlichen Grüßen\nIhr Bärenwald München Team' ||
    (t.includes('unterzeichn') && t.includes('zurück'))
  )
}

export function defaultAngebotPdfSchlusstext(anrede: AngebotMailAnrede, teamLabel: string): string {
  if (anrede === 'du') {
    return `Wir haben dieses Angebot mit Sorgfalt für dich zusammengestellt. Wenn du Fragen hast oder einzelne Positionen besprechen möchtest — melde dich einfach. Wir sind für dich da.

Viele Grüße
${teamLabel}`
  }
  return `Wir haben dieses Angebot mit Sorgfalt für Sie zusammengestellt. Sollten Sie Fragen haben oder einzelne Positionen besprechen wollen — sprechen Sie uns gerne an. Wir sind für Sie da.

Mit freundlichen Grüßen
${teamLabel}`
}

export function resolveAngebotMailEinleitung(
  einleitung: string | undefined,
  anrede: AngebotMailAnrede,
  leistungsumfang: string
): string {
  const t = einleitung?.trim()
  if (t) return t
  return defaultAngebotEinleitungText(anrede, leistungsumfang)
}

export function resolveAngebotMailSchluss(
  schluss: string | undefined,
  anrede: AngebotMailAnrede
): string {
  const t = schluss?.trim()
  if (t) return t
  return defaultAngebotSchlussText(anrede)
}

/** Trenner im Wizard-Editor — Angebotsbox wird in der Mail dazwischen eingefügt. */
export const ANGEBOT_MAIL_BOX_MARKER = '[Angebots-Übersicht wird hier automatisch eingefügt]'

export function angebotMailGreetingLine(
  anrede: AngebotMailAnrede,
  kunde: KundeAnredeKontext
): string {
  return kundeAngebotBegruessung(anrede, kunde)
}

/** Fließtext für den kombinierten E-Mail-Editor (ohne Begrüßung & ohne Angebotsbox). */
export function angebotMailBodyForEditor(
  einleitung: string | undefined,
  schluss: string | undefined,
  anrede: AngebotMailAnrede,
  leistungsumfang: string
): string {
  const einl = resolveAngebotMailEinleitung(einleitung, anrede, leistungsumfang)
  const sch = resolveAngebotMailSchluss(schluss, anrede)
  return `${einl}\n\n${ANGEBOT_MAIL_BOX_MARKER}\n\n${sch}`
}

export function parseAngebotMailBodyFromEditor(
  body: string,
  anrede: AngebotMailAnrede,
  _leistungsumfang: string
): { einleitung: string; schluss: string } {
  void _leistungsumfang
  const marker = ANGEBOT_MAIL_BOX_MARKER
  const idx = body.indexOf(marker)
  if (idx === -1) {
    const t = body.trim()
    return {
      einleitung: t,
      schluss: defaultAngebotSchlussText(anrede),
    }
  }
  const einleitung = body.slice(0, idx).trim()
  const schluss = body
    .slice(idx + marker.length)
    .replace(/^\s*\n+/, '')
    .trim()
  return {
    einleitung,
    schluss: schluss || defaultAngebotSchlussText(anrede),
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Begrüßungszeile im Angebots-PDF (nicht in der Mail). */
export function angebotPdfBegruessung(
  anrede: AngebotMailAnrede,
  kunde: KundeAnredeKontext
): string {
  return kundeAngebotBegruessung(anrede, kunde)
}

/** Einleitung im PDF, wenn im Wizard kein eigener Text gesetzt ist. */
export function defaultAngebotPdfEinleitungText(anrede: AngebotMailAnrede): string {
  if (anrede === 'du') {
    return 'vielen Dank für deine Anfrage und dein Vertrauen. Gerne unterbreiten wir dir folgendes Angebot:'
  }
  return 'vielen Dank für Ihre Anfrage und Ihr Vertrauen. Gerne unterbreiten wir Ihnen folgendes Angebot:'
}

export function resolveAngebotPdfEinleitung(
  einleitung: string | undefined,
  anrede: AngebotMailAnrede
): string {
  const t = einleitung?.trim()
  if (t) return t
  return defaultAngebotPdfEinleitungText(anrede)
}

export function angebotMailBetreff(
  anrede: AngebotMailAnrede,
  angebotsnr: string,
  firmenname = 'Bärenwald München'
): string {
  const nr = angebotsnr.trim() || 'Angebot'
  return anrede === 'du'
    ? `Dein Angebot — ${firmenname} · ${nr}`
    : `Ihr Angebot — ${firmenname} · ${nr}`
}

function textToHtmlParagraphs(text: string): string {
  return esc(text.trim())
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, '<br/>'))
    .filter(Boolean)
    .map((block) => `<p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${block}</p>`)
    .join('')
}

export function buildAngebotMail(data: AngebotMailInput, branding: MailBranding): string {
  const {
    angebotsnr,
    leistungsumfang,
    gesamt_brutto,
    gueltig_bis,
    anrede,
    einleitung,
    schluss,
    istKorrektur,
  } = data

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const anredeText = esc(kundeAngebotBegruessung(anrede, data))

  const einleitungResolved = resolveAngebotMailEinleitung(einleitung, anrede, leistungsumfang)
  const einleitungFinal = istKorrektur
    ? `${angebotKorrekturEinleitungPrefix(anrede)}\n\n${einleitungResolved}`
    : einleitungResolved
  const einleitungHtml = textToHtmlParagraphs(einleitungFinal)

  const ctaDu =
    'Zum Angebot annehmen: Sende uns das unterzeichnete Angebot zurück oder antworte einfach auf diese E-Mail — wir freuen uns von dir zu hören.'
  const ctaSie =
    'Zum Angebot annehmen: Senden Sie uns das unterzeichnete Angebot zurück oder antworten Sie einfach auf diese E-Mail — wir freuen uns auf Ihre Rückmeldung.'
  const schlussRaw = resolveAngebotMailSchluss(schluss, anrede)
  const grussHtml = textToHtmlParagraphs(schlussRaw)

  const boxLabel = anrede === 'du' ? 'DEIN ANGEBOT' : 'IHR ANGEBOT'
  const pdfHinweis =
    anrede === 'du'
      ? 'Das detaillierte Angebot findest du im PDF-Anhang.'
      : 'Das detaillierte Angebot finden Sie im PDF-Anhang.'
  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail, weil du ein Angebot von uns erhalten hast.'
      : 'Sie erhalten diese Mail, weil Sie ein Angebot von uns erhalten haben.'

  const summaryHtml = mailSummaryBlock({
    label: `${boxLabel} · ${esc(angebotsnr)}`,
    title: esc(leistungsumfang),
    priceHtml: `<p style="font-size:16px;font-weight:700;color:#2E7D52;margin:0;">${formatEur(gesamt_brutto)} € <span style="font-size:12px;font-weight:400;color:#6B7280;">inkl. MwSt.</span></p>`,
    metaHtml: `<p style="font-size:12px;color:#6B7280;margin:8px 0 0;">Gültig bis: <strong style="color:#374151;">${esc(gueltig_bis)}</strong></p>`,
  })

  const vizHtml = data.visualisierung_vorschau_url
    ? mailKiVisualisierungBlock(anrede, data.visualisierung_vorschau_url)
    : ''

  const anredeKey = anrede === 'sie' ? 'sie' : 'du'
  const content = `
      <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${anredeText}</p>
      ${einleitungHtml}
      ${summaryHtml}
      ${vizHtml}
      <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.6;">${pdfHinweis}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">
        ${anrede === 'du' ? ctaDu : ctaSie}
      </p>
      ${grussHtml}
      <p style="font-size:14px;color:#374151;margin:16px 0 0;line-height:1.6;">${mailKundenContactLine(anredeKey, branding.telefon)}</p>`

  const preheader = `${angebotsnr} · ${formatEur(gesamt_brutto)} € · gültig bis ${gueltig_bis}`
  return mailHtmlBase(
    content,
    preheader,
    branding,
    disclaimer,
    mailKundenStandardOptions(anredeKey, data.portalLink, data.portalAudience)
  )
}

export type NachfassMailInput = AngebotMailInput

export function gueltigReminderMailBetreff(
  anrede: AngebotMailAnrede,
  angebotsnr: string,
  gueltigBisDe: string
): string {
  const nr = angebotsnr.trim() || 'Angebot'
  return anrede === 'du'
    ? `Dein Angebot läuft am ${gueltigBisDe} aus — ${nr}`
    : `Ihr Angebot läuft am ${gueltigBisDe} aus — ${nr}`
}

/** Erinnerung 7 Tage nach Versand/Verlängerung — weiß, schlicht, ohne Summary-Card. */
export function buildAngebotGueltigReminderMail(
  data: NachfassMailInput,
  branding: MailBranding
): { betreff: string; html: string } {
  const { angebotsnr, leistungsumfang, gueltig_bis, anrede } = data

  const tel = esc(branding.telefon)
  const telHref = tel.replace(/\s/g, '')

  const h1 = anrede === 'du' ? 'Dein Angebot ist noch gültig' : 'Ihr Angebot ist noch gültig'
  const anredeText = esc(kundeAngebotBegruessung(anrede, data))

  const bodyDu = `dein Angebot <strong>${esc(angebotsnr)}</strong> für „${esc(leistungsumfang)}“ läuft am <strong>${esc(gueltig_bis)}</strong> aus. Wenn du noch Fragen hast oder das Angebot annehmen möchtest, melde dich gerne bei uns.`
  const bodySie = `Ihr Angebot <strong>${esc(angebotsnr)}</strong> für „${esc(leistungsumfang)}“ läuft am <strong>${esc(gueltig_bis)}</strong> aus. Bei Fragen oder zur Annahme des Angebots stehen wir Ihnen gerne zur Verfügung.`

  const cta =
    anrede === 'du'
      ? 'Melde dich einfach — wir helfen gerne weiter.'
      : 'Melden Sie sich einfach — wir helfen gerne weiter.'

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Erinnerung zu deinem Angebot.'
      : 'Sie erhalten diese Erinnerung zu Ihrem Angebot.'

  const content = `
      <h1 style="font-size:22px;font-weight:700;color:#111111;margin:0 0 20px;">${h1}</h1>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${anredeText}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${anrede === 'du' ? bodyDu : bodySie}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.6;">${cta}</p>
      <p style="margin:0 0 20px;">
        ${mailPrimaryButtonHtml('Jetzt anrufen →', `tel:${telHref}`, { margin: '0', size: 'sm' })}
      </p>`

  const betreff = gueltigReminderMailBetreff(anrede, angebotsnr, gueltig_bis)
  const preheader = `${angebotsnr} · gültig bis ${gueltig_bis}`
  const html = mailHtmlBase(content, preheader, branding, disclaimer, { anrede })
  return { betreff, html }
}

/** @deprecated Alias — nutzt buildAngebotGueltigReminderMail */
export function nachfassMailBetreff(anrede: AngebotMailAnrede, angebotsnr: string): string {
  return gueltigReminderMailBetreff(anrede, angebotsnr, '…')
}

/** @deprecated Alias — nutzt buildAngebotGueltigReminderMail */
export function buildNachfassMail(data: NachfassMailInput, branding: MailBranding): {
  betreff: string
  html: string
} {
  return buildAngebotGueltigReminderMail(data, branding)
}
