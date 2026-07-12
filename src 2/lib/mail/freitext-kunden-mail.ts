import type { MailBranding } from '@/lib/mail-branding'
import { mailBegruessungZeile, mailTeamGruss, resolveMailAnrede, type MailAnrede } from '@/lib/mail/anrede'
import { emailLogHtmlMarker } from '@/lib/kommunikation/types'
import { mailHtmlBase } from '@/lib/mail-templates'

/** Plain-Text mit Zeilenumbrüchen → HTML-Absätze. */
export function plainTextToMailParagraphs(text: string): string {
  const t = text.trim()
  if (!t) return ''
  if (/<[a-z][\s\S]*>/i.test(t)) return t
  return t
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, '<br/>'))
    .map(
      (p) =>
        `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${p}</p>`
    )
    .join('')
}

export function buildFreitextKundenMailHtml(input: {
  displayName: string
  bodyHtml: string
  anrede?: MailAnrede | null
  kundeTyp?: string | null
  branding: MailBranding
  statusLink?: string | null
  emailLogId?: string | null
  includeGreeting?: boolean
}): string {
  const anrede = resolveMailAnrede(input.anrede, input.kundeTyp)
  const greeting = input.includeGreeting !== false
    ? `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${mailBegruessungZeile(
        anrede,
        input.displayName
      )}</p>`
    : ''
  const body = plainTextToMailParagraphs(input.bodyHtml)
  const gruss = `<p style="font-size:15px;color:#374151;margin:16px 0 0;line-height:1.6;">${mailTeamGruss(
    anrede,
    input.branding.firmenname
  )}</p>`
  const marker = input.emailLogId ? emailLogHtmlMarker(input.emailLogId) : ''
  const content = `${marker}${greeting}${body}${gruss}`
  return mailHtmlBase(content, '', input.branding, undefined, {
    anrede,
    statusLink: input.statusLink ?? null,
  })
}

export function defaultFreitextMailBody(anrede: MailAnrede): string {
  return anrede === 'du'
    ? '<p>vielen Dank für deine Nachricht.</p><p></p><p>Bei Rückfragen melde dich gerne.</p>'
    : '<p>vielen Dank für Ihre Nachricht.</p><p></p><p>Bei Rückfragen melden Sie sich gerne.</p>'
}
