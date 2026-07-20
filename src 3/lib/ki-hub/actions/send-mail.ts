import 'server-only'

import { sendMail } from '@/lib/mail-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type KiHubSendMailInput = {
  to: string
  name?: string | null
  betreff: string
  text: string
  lead_id?: string | null
  empfehlung_id?: string | null
  preview?: boolean
}

export type KiHubSendMailResult =
  | { ok: true; preview: true; to: string; betreff: string; text_vorschau: string }
  | { ok: true; preview: false; gesendet: boolean; resendId?: string | null }
  | { ok: false; message: string }

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function resolveRecipient(input: KiHubSendMailInput): Promise<{
  to: string
  name: string | null
  leadId: string | null
}> {
  if (input.to?.trim()) {
    return { to: input.to.trim(), name: input.name?.trim() ?? null, leadId: input.lead_id ?? null }
  }

  const leadId = input.lead_id?.trim()
  if (!leadId) {
    return { to: '', name: null, leadId: null }
  }

  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_name, kontakt_email')
    .eq('id', leadId)
    .maybeSingle()

  return {
    to: (data?.kontakt_email as string | null)?.trim() ?? '',
    name: (data?.kontakt_name as string | null)?.trim() ?? null,
    leadId: data?.id as string | null,
  }
}

export async function kiHubSendMail(input: KiHubSendMailInput): Promise<KiHubSendMailResult> {
  const betreff = input.betreff?.trim()
  const text = input.text?.trim()
  if (!betreff) return { ok: false, message: 'Betreff fehlt' }
  if (!text) return { ok: false, message: 'Text fehlt' }

  const recipient = await resolveRecipient(input)
  if (!recipient.to) {
    return { ok: false, message: 'Empfänger-E-Mail fehlt (to oder lead_id mit kontakt_email)' }
  }

  if (input.preview) {
    return {
      ok: true,
      preview: true,
      to: recipient.to,
      betreff,
      text_vorschau: text.slice(0, 800),
    }
  }

  const html = `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`
  const result = await sendMail({
    typ: 'freitext_kunde',
    an: recipient.to,
    anName: recipient.name ?? input.name ?? undefined,
    betreff,
    html,
    leadId: recipient.leadId,
  })

  if (!result.success) {
    return { ok: false, message: result.error ?? 'Versand fehlgeschlagen' }
  }

  if (input.empfehlung_id) {
    await supabaseAdmin.from('system_events').insert({
      quelle: 'ki_hub',
      event_typ: 'mail_gesendet',
      severity: 'info',
      details: {
        empfehlung_id: input.empfehlung_id,
        lead_id: recipient.leadId,
        betreff,
        resend_id: result.resendId ?? null,
      },
    })
  }

  return { ok: true, preview: false, gesendet: true, resendId: result.resendId }
}
