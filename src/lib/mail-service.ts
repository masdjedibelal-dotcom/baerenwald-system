import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM_DEFAULT =
  process.env.RESEND_FROM_EMAIL ?? 'Bärenwald München <info@baerenwaldmuenchen.de>'
const FROM_ANFRAGEN =
  process.env.RESEND_FROM_ANFRAGEN ?? 'Bärenwald München <anfragen@baerenwaldmuenchen.de>'

export interface SendMailOptions {
  typ: string
  an: string
  anName?: string | null
  betreff: string
  html: string
  /** Optional: Resend „from“ (Domain muss bei Resend verifiziert sein). */
  from?: string
  pdfBuffer?: Buffer
  pdfName?: string
  kundeId?: string | null
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}

async function resolveGesendetVon(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function sendMail(
  opts: SendMailOptions
): Promise<{ success: boolean; error?: string; resendId?: string | null }> {
  const attachments = opts.pdfBuffer
    ? [{ filename: opts.pdfName ?? 'dokument.pdf', content: opts.pdfBuffer }]
    : undefined

  const resend = getResend()
  if (!resend) {
    const msg = 'RESEND_API_KEY fehlt'
    await logMailError(opts, msg)
    return { success: false, error: msg }
  }

  try {
    const fromAddr =
      opts.from ??
      (opts.typ === 'angebot' || opts.typ === 'handwerker_anfrage' || opts.typ === 'handwerker_formular'
        ? FROM_ANFRAGEN
        : FROM_DEFAULT)
    const result = await resend.emails.send({
      from: fromAddr,
      to: opts.an,
      subject: opts.betreff,
      html: opts.html,
      attachments,
    })

    if (result.error) {
      await logMailError(opts, result.error.message)
      return { success: false, error: result.error.message }
    }

    const gesendetVon = await resolveGesendetVon()
    const resendId = result.data?.id ?? null

    const { error: insErr } = await supabaseAdmin.from('email_log').insert({
      typ: opts.typ,
      an_email: opts.an,
      an_name: opts.anName ?? null,
      betreff: opts.betreff,
      inhalt_html: opts.html,
      status: 'gesendet',
      kunde_id: opts.kundeId ?? null,
      lead_id: opts.leadId ?? null,
      angebot_id: opts.angebotId ?? null,
      auftrag_id: opts.auftragId ?? null,
      rechnung_id: opts.rechnungId ?? null,
      gesendet_von: gesendetVon,
      resend_id: resendId,
    })

    if (insErr) {
      console.warn('[mail-service] email_log insert:', insErr.message)
    }

    return { success: true, resendId }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await logMailError(opts, msg)
    return { success: false, error: msg }
  }
}

async function logMailError(opts: SendMailOptions, message: string) {
  const gesendetVon = await resolveGesendetVon()
  const { error } = await supabaseAdmin.from('email_log').insert({
    typ: opts.typ,
    an_email: opts.an,
    an_name: opts.anName ?? null,
    betreff: opts.betreff,
    inhalt_html: opts.html,
    status: 'fehler',
    fehler_nachricht: message,
    kunde_id: opts.kundeId ?? null,
    lead_id: opts.leadId ?? null,
    angebot_id: opts.angebotId ?? null,
    auftrag_id: opts.auftragId ?? null,
    rechnung_id: opts.rechnungId ?? null,
    gesendet_von: gesendetVon,
  })
  if (error) console.warn('[mail-service] email_log fehler-insert:', error.message)
}
