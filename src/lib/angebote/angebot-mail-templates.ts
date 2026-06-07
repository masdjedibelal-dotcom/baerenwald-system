import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Interne Benachrichtigung nach HW-Antwort (API handwerker/anfrage/…/antwort). */
export function buildInternHandwerkerAntwortMail(input: {
  handwerkerName: string
  gewerkName: string
  angenommen: boolean
  /** bei Ablehnung: ausgewählter Grund (Kurztext) */
  ablehnungGrund?: string | null
  notiz: string | null
  dashboardUrl: string
}): string {
  const status = input.angenommen ? 'angenommen' : 'abgelehnt'
  const grund =
    !input.angenommen && input.ablehnungGrund?.trim()
      ? `<p><strong>Grund:</strong> ${esc(input.ablehnungGrund.trim())}</p>`
      : ''
  const notiz = input.notiz?.trim()
    ? `<p><strong>Weitere Notiz:</strong> ${esc(input.notiz.trim())}</p>`
    : ''
  const hinweis = !input.angenommen
    ? `<p style="margin-top:16px;padding:12px 14px;background:#FFF8E1;border-radius:8px;border:1px solid #F9A825;">
        <strong>Handlungsbedarf:</strong> Anderen Handwerker für <strong>${esc(input.gewerkName)}</strong> auswählen und erneut anfragen.
      </p>`
    : ''
  return `
  <p>Handwerker <strong>${esc(input.handwerkerName)}</strong> hat die Anfrage für <strong>${esc(input.gewerkName)}</strong> <strong>${status}</strong>.</p>
  ${grund}
  ${notiz}
  ${hinweis}
  <p style="margin-top:12px;">${mailPrimaryButtonHtml('Im Dashboard öffnen', input.dashboardUrl, { margin: '0', size: 'sm' })}</p>
  `
}
