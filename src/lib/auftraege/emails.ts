import { sendMail } from '@/lib/mail-service'

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
