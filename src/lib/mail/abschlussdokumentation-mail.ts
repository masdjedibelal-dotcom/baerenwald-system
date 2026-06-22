import type { MailBranding } from '@/lib/mail-branding'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { mailHtmlBase } from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

/** Google-Bewertungslink (Bärenwald München auf Maps). */
export const BAERENWALD_GOOGLE_BEWERTUNG_URL =
  'https://www.google.com/maps/place/B%C3%A4renwald+M%C3%BCnchen+-+Handwerk+%E2%80%A2+Projektservice+%E2%80%A2+Gartenservice/@48.1073864,11.6160044,17z/data=!4m8!3m7!1s0x479ddf12e463b187:0xe8686e3310017da8!8m2!3d48.1073864!4d11.6160044!9m1!1b1!16s%2Fg%2F11mhfwp85j?entry=ttu'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtmlParagraphs(text: string): string {
  return esc(text.trim())
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, '<br/>'))
    .filter(Boolean)
    .map((block) => `<p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${block}</p>`)
    .join('')
}

/** Standardtext für das Nachrichtenfeld (ohne Begrüßungszeile). */
export function defaultAbschlussdokumentationNachricht(
  anrede: AngebotMailAnrede,
  projektTitel?: string | null,
  opts?: { hasAbnahme?: boolean; hasRechnung?: boolean }
): string {
  const projekt = projektTitel?.trim() || (anrede === 'du' ? 'Dein Projekt' : 'Ihr Projekt')
  const hasAbnahme = opts?.hasAbnahme === true
  const hasRechnung = opts?.hasRechnung === true

  const anhaengeDu = (() => {
    if (hasAbnahme && hasRechnung) {
      return 'Im Anhang findest du — in dieser Reihenfolge — das Abnahmeprotokoll, die Rechnung und die vollständige Abschlussdokumentation.'
    }
    if (hasAbnahme) {
      return 'Im Anhang findest du das Abnahmeprotokoll und die vollständige Abschlussdokumentation.'
    }
    if (hasRechnung) {
      return 'Im Anhang findest du die Rechnung und die vollständige Abschlussdokumentation.'
    }
    return 'Im Anhang findest du die vollständige Abschlussdokumentation.'
  })()

  const anhaengeSie = (() => {
    if (hasAbnahme && hasRechnung) {
      return 'Anbei erhalten Sie — in dieser Reihenfolge — das Abnahmeprotokoll, die Rechnung und die vollständige Abschlussdokumentation.'
    }
    if (hasAbnahme) {
      return 'Anbei erhalten Sie das Abnahmeprotokoll und die vollständige Abschlussdokumentation.'
    }
    if (hasRechnung) {
      return 'Anbei erhalten Sie die Rechnung und die vollständige Abschlussdokumentation.'
    }
    return 'Anbei erhalten Sie die vollständige Abschlussdokumentation.'
  })()
  if (anrede === 'du') {
    return `${projekt} ist abgeschlossen. ${anhaengeDu}

Wir freuen uns auf die weitere Zusammenarbeit mit dir und würden uns über dein Feedback freuen — sowohl über positive Erfahrungen als auch über Hinweise, wo wir noch besser werden können.

Vielen Dank für dein Vertrauen!`
  }
  return `${projekt} ist abgeschlossen. ${anhaengeSie}

Wir freuen uns auf die weitere Zusammenarbeit mit Ihnen und würden uns über Ihr Feedback freuen — sowohl über positive Erfahrungen als auch über Hinweise, wo wir noch besser werden können.

Herzlichen Dank für Ihr Vertrauen!`
}

export function abschlussdokumentationMailBetreff(
  anrede: AngebotMailAnrede,
  projektTitel: string,
  firmenname: string
): string {
  const titel = projektTitel.trim() || (anrede === 'du' ? 'Dein Projekt' : 'Ihr Projekt')
  return anrede === 'du'
    ? `Projektabschluss — ${titel} · ${firmenname}`
    : `Projektabschluss — ${titel} · ${firmenname}`
}

export type AbschlussdokumentationMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  nachricht: string
  projektTitel: string
}

export function buildAbschlussdokumentationMail(
  data: AbschlussdokumentationMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nachrichtHtml = textToHtmlParagraphs(data.nachricht)
  const projektTitel = data.projektTitel.trim() || (anrede === 'du' ? 'Dein Projekt' : 'Ihr Projekt')

  const googleIntro =
    anrede === 'du'
      ? 'Über eine Bewertung bei Google würden wir uns sehr freuen:'
      : 'Über eine Bewertung bei Google würden wir uns sehr freuen:'
  const googleBtnLabel = anrede === 'du' ? 'Jetzt bei Google bewerten' : 'Jetzt bei Google bewerten'

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
      ? 'Du erhältst diese Mail, weil dein Projekt bei uns abgeschlossen wurde.'
      : 'Sie erhalten diese Mail, weil Ihr Projekt bei uns abgeschlossen wurde.'

  const googleCta = `<p style="font-size:14px;color:#374151;margin:0 0 8px;line-height:1.6;">${esc(googleIntro)}</p>
      <p style="margin:0 0 20px;">${mailPrimaryButtonHtml(`${googleBtnLabel} →`, BAERENWALD_GOOGLE_BEWERTUNG_URL, { margin: '0', size: 'sm' })}</p>`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      ${nachrichtHtml}
      ${googleCta}
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    `${projektTitel} · Abschlussdokumentation`,
    b,
    disclaimer,
    { anrede }
  )

  return {
    betreff: abschlussdokumentationMailBetreff(anrede, projektTitel, b.firmenname),
    html,
  }
}
