import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { sendMail } from '@/lib/mail-service'
import type { AuftragStatus } from '@/lib/types'
import { AUFTRAG_STATUS_LABELS, getPublicAppUrl } from '@/lib/utils'

export async function sendEmailHtml(input: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
  typ?: string
  kundeId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await sendMail({
    typ: input.typ ?? 'sonstiges',
    an: input.to,
    betreff: input.subject,
    html: input.html,
    pdfBuffer: input.attachments?.[0]?.content,
    pdfName: input.attachments?.[0]?.filename,
    kundeId: input.kundeId,
    auftragId: input.auftragId,
    rechnungId: input.rechnungId,
  })
  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true }
}

function absUrl(path: string) {
  return `${getPublicAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
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
  <p>Ein Handwerker-Formular wurde abgesendet.</p>
  <p><strong>Template:</strong> ${input.templateName}<br/>
  <strong>Kunde:</strong> ${input.kunde}<br/>
  <strong>Auftrag:</strong> ${input.auftragId}${hw}</p>
  <p style="margin-top:12px;">${mailPrimaryButtonHtml('Jetzt ansehen', url, { margin: '0', size: 'sm' })}</p>
  `
}

export function statusLabelDe(status: AuftragStatus) {
  return AUFTRAG_STATUS_LABELS[status]
}
