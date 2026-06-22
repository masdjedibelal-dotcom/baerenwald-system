import { sendMail } from '@/lib/mail-service'

/** Interne Benachrichtigung (INTERN_EMAIL); ohne Empfänger no-op */
export async function sendInternNotifyEmail(input: { subject: string; html: string }) {
  const to = process.env.INTERN_EMAIL?.trim()
  if (!to) return { ok: true as const }
  const r = await sendMail({
    typ: 'intern_hinweis',
    an: to,
    betreff: input.subject,
    html: input.html,
  })
  if (!r.success) return { ok: false as const, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true as const }
}
