import type { MailBranding } from '@/lib/mail-branding'
import { mailHtmlBase } from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type AngebotNachfassMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  angebotsnummer: string
  projektTitel: string
}

export function angebotNachfassMailBetreff(
  anrede: AngebotMailAnrede,
  angebotsnummer: string,
  firmenname: string
): string {
  return anrede === 'du'
    ? `Kurze Rückfrage zu deinem Angebot ${angebotsnummer} · ${firmenname}`
    : `Kurze Rückfrage zu Ihrem Angebot ${angebotsnummer} · ${firmenname}`
}

export function buildAngebotNachfassMail(
  data: AngebotNachfassMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nr = esc(data.angebotsnummer)
  const titel = esc(data.projektTitel.trim() || data.angebotsnummer)

  const intro =
    anrede === 'du'
      ? `vor einiger Zeit haben wir dir unser Angebot <strong>${nr}</strong> für „${titel}" zugesendet. Wir wollten kurz nachfragen, ob es für dich passt.`
      : `vor einiger Zeit haben wir Ihnen unser Angebot <strong>${nr}</strong> für „${titel}" zugesendet. Wir wollten kurz nachfragen, ob es für Sie passt.`

  const fragen =
    anrede === 'du'
      ? 'Wenn du noch Fragen hast, etwas anpassen möchtest oder wir gemeinsam durchgehen sollen — melde dich einfach. Wir sind gerne für dich da.'
      : 'Wenn Sie noch Fragen haben, etwas anpassen möchten oder wir gemeinsam durchgehen sollen — melden Sie sich einfach. Wir sind gerne für Sie da.'

  const tel = esc(b.telefon)
  const telHref = tel.replace(/\s/g, '')
  const contact =
    anrede === 'du'
      ? `Telefonisch erreichst du uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`
      : `Telefonisch erreichen Sie uns unter <a href="tel:${telHref}" style="color:#2E7D52;text-decoration:none;">${tel}</a>.`

  const gruss =
    anrede === 'du'
      ? 'Viele Grüße<br/><strong>Dein Bärenwald Team</strong>'
      : 'Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>'

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail als freundliche Erinnerung zu deinem Angebot.'
      : 'Sie erhalten diese Mail als freundliche Erinnerung zu Ihrem Angebot.'

  const preheader = `${data.angebotsnummer} · passt das Angebot noch?`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${intro}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${fragen}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    { anrede }
  )

  return {
    betreff: angebotNachfassMailBetreff(anrede, data.angebotsnummer, b.firmenname),
    html,
  }
}
