import { Resend } from 'resend'
import type { AuftragStatus, Kunde } from '@/lib/types'
import { AUFTRAG_STATUS_LABELS } from '@/lib/utils'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const fromDefault =
  process.env.RESEND_FROM_EMAIL ?? 'Bärenwald <onboarding@resend.dev>'

export async function sendEmailHtml(input: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}) {
  const resend = getResend()
  if (!resend) return { ok: false as const, message: 'RESEND_API_KEY fehlt' }
  const { error } = await resend.emails.send({
    from: fromDefault,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  })
  if (error) return { ok: false as const, message: error.message }
  return { ok: true as const }
}

function absUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildAuftragsbestaetigungHtml(input: {
  kunde: Kunde
  gewerkeHtml: string
  handwerkerHtml: string
  startDatum: string | null
  projektLink?: string | null
}) {
  const link = input.projektLink?.trim()
  const linkBlock = link
    ? `<p style="margin:20px 0;">
        <a href="${link.replace(/"/g, '&quot;')}"
          style="display:inline-block;background:#2E7D52;color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
          Projekt-Status ansehen
        </a>
      </p>
      <p style="font-size:13px;color:#6B6B6B;">Fortschritt jederzeit online — ohne Passwort.</p>`
    : ''
  return `
  <p>Guten Tag ${input.kunde.name.split(' ')[0] ?? input.kunde.name},</p>
  <p>Ihr Auftrag wurde bestätigt.</p>
  ${linkBlock}
  <p><strong>Gewerke:</strong></p>
  ${input.gewerkeHtml}
  <p><strong>Handwerker:</strong><br/>${input.handwerkerHtml}</p>
  <p><strong>Geplanter Start:</strong> ${input.startDatum ?? 'wird noch abgestimmt'}</p>
  <p>Bei Fragen erreichen Sie uns jederzeit.</p>
  <p>Mit freundlichen Grüßen<br/>Bärenwald München</p>
  `
}

export function buildFormularLinkHtml(input: {
  templateName: string
  phaseLabel: string
  kundenname: string
  adresse: string
  gewerkName: string
  token: string
}) {
  const url = absUrl(`/formular/${input.token}`)
  return `
  <p>Guten Tag,</p>
  <p>bitte füllen Sie das Formular <strong>${input.templateName}</strong> aus.</p>
  <p><strong>Phase:</strong> ${input.phaseLabel}<br/>
  <strong>Gewerk:</strong> ${input.gewerkName}<br/>
  <strong>Kunde:</strong> ${input.kundenname}<br/>
  <strong>Adresse:</strong> ${input.adresse}</p>
  <p><a href="${url}">Zum Formular</a></p>
  <p>Mit freundlichen Grüßen<br/>Bärenwald München</p>
  `
}

export function buildAbnahmeProtokollMailHtml(input: { kunde: Kunde }) {
  return `
  <p>Guten Tag ${input.kunde.name.split(' ')[0] ?? input.kunde.name},</p>
  <p>vielen Dank für Ihr Vertrauen. Anbei finden Sie Ihr Abnahmeprotokoll.</p>
  <p>Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.</p>
  <p>Mit freundlichen Grüßen<br/>Bärenwald München</p>
  `
}

export function buildInternFormularSubmittedHtml(input: {
  templateName: string
  kunde: string
  auftragId: string
  handwerkerName?: string
}) {
  const url = absUrl(`/auftraege/${input.auftragId}`)
  const hw = input.handwerkerName
    ? `<br/><strong>Handwerker:</strong> ${input.handwerkerName}`
    : ''
  return `
  <p>📸 Ein Handwerker-Formular wurde abgesendet.</p>
  <p><strong>Template:</strong> ${input.templateName}<br/>
  <strong>Kunde:</strong> ${input.kunde}<br/>
  <strong>Auftrag:</strong> ${input.auftragId}${hw}</p>
  <p><a href="${url}" style="display:inline-block;margin-top:12px;padding:10px 18px;background:#2E7D52;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Jetzt ansehen</a></p>
  `
}

export function statusLabelDe(status: AuftragStatus) {
  return AUFTRAG_STATUS_LABELS[status]
}
