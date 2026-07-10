import { Resend } from 'resend'
import { cache } from 'react'
import { KUNDE_MAIL_BCC } from '@/lib/mail-constants'
import { mailLogoInlineEnabled } from '@/lib/mail/mail-logo-inline'
import {
  inlineLogoAttachmentsForHtml,
  type MailInlineLogoAttachment,
} from '@/lib/mail/mail-logo-inline.server'
import { createClient } from '@/lib/supabase-server'
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertEmailLogRow } from '@/lib/kommunikation/insert-email-log'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM_DEFAULT =
  process.env.RESEND_FROM_EMAIL ?? 'Bärenwald München <info@baerenwaldmuenchen.de>'
const FROM_ANFRAGEN =
  process.env.RESEND_FROM_ANFRAGEN ?? 'Bärenwald München <anfragen@baerenwaldmuenchen.de>'

/** Kunden-Mails: automatische BCC-Kopie ans interne Postfach. */
const KUNDE_MAIL_BCC_TYPEN = new Set([
  'angebot',
  'angebot_nachfass',
  'auftragsbestaetigung',
  'update_hinweis',
  'projekt_update',
  'bautagebuch',
  'rechnung',
  'zahlungsbestaetigung',
  'zahlungserinnerung',
  'abnahmeprotokoll',
  'abschlussdokumentation',
  'anfrage_bestaetigung',
  'besichtigung_termin',
  'nachtrag',
  'freitext_anfrage',
  'freitext_angebot',
  'freitext_auftrag',
  'freitext_rechnung',
  'freitext_kunde',
])

export interface SendMailOptions {
  typ: string
  /** Ein oder mehrere Empfänger (Resend „to“). */
  an: string | string[]
  anName?: string | null
  /** Optionale CC-Empfänger (sichtbar für alle). */
  cc?: string | string[]
  /** Optionale BCC; leeres Array deaktiviert die Auto-BCC für diesen Versand. */
  bcc?: string | string[]
  betreff: string
  html: string
  /** Optional: Resend „from“ (Domain muss bei Resend verifiziert sein). */
  from?: string
  pdfBuffer?: Buffer
  pdfName?: string
  /** Weitere PDF-Anhänge vor dem Haupt-PDF (Reihenfolge bleibt erhalten). */
  extraPdfAttachments?: { filename: string; content: Buffer }[]
  kundeId?: string | null
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
  kontextTyp?: string | null
  richtung?: 'gesendet' | 'empfangen'
  vonEmail?: string | null
  inReplyToLogId?: string | null
  internetMessageId?: string | null
  /** Feste ID für email_log (z. B. Tracking-Marker in HTML). */
  emailLogId?: string
}

function normalizeRecipients(list?: string | string[]): string[] | undefined {
  if (list === undefined) return undefined
  const normalized = (Array.isArray(list) ? list : [list]).map((s) => s.trim()).filter(Boolean)
  return normalized.length ? normalized : undefined
}

function resolveBcc(opts: SendMailOptions): string[] | undefined {
  if (opts.bcc !== undefined) {
    return normalizeRecipients(opts.bcc)
  }
  if (!KUNDE_MAIL_BCC_TYPEN.has(opts.typ)) return undefined
  return [KUNDE_MAIL_BCC]
}

async function resolveGesendetVon(): Promise<string | null> {
  return getAuthUserIdCached()
}

const getAuthUserIdCached = cache(async (): Promise<string | null> => {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
})

function mergeAttachments(
  pdf?: { filename: string; content: Buffer },
  inlineLogos?: MailInlineLogoAttachment[],
  extraPdfs?: { filename: string; content: Buffer }[]
) {
  const list: Array<{
    filename: string
    content: Buffer
    contentId?: string
    contentType?: string
  }> = []
  for (const logo of inlineLogos ?? []) {
    list.push({
      filename: logo.filename,
      content: logo.content,
      contentId: logo.contentId,
      contentType: logo.contentType,
    })
  }
  for (const extra of extraPdfs ?? []) {
    list.push({ filename: extra.filename, content: extra.content })
  }
  if (pdf) {
    list.push({ filename: pdf.filename, content: pdf.content })
  }
  return list.length ? list : undefined
}

export async function sendMail(
  opts: SendMailOptions
): Promise<{ success: boolean; error?: string; resendId?: string | null; emailLogId?: string | null }> {
  const html = opts.html
  const inlineLogos =
    mailLogoInlineEnabled() ? inlineLogoAttachmentsForHtml(html) : []
  const attachments = mergeAttachments(
    opts.pdfBuffer
      ? { filename: opts.pdfName ?? 'dokument.pdf', content: opts.pdfBuffer }
      : undefined,
    inlineLogos,
    opts.extraPdfAttachments
  )

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
    const cc = normalizeRecipients(opts.cc)
    const bcc = resolveBcc(opts)
    const to = Array.isArray(opts.an) ? opts.an : [opts.an]
    const result = await resend.emails.send({
      from: fromAddr,
      to,
      ...(cc ? { cc } : {}),
      ...(bcc ? { bcc } : {}),
      subject: opts.betreff,
      html,
      attachments,
    })

    if (result.error) {
      await logMailError(opts, result.error.message)
      return { success: false, error: result.error.message }
    }

    const gesendetVon = await resolveGesendetVon()
    const resendId = result.data?.id ?? null

    const ccJoined = cc?.join(', ') ?? null
    const insertRow: Record<string, unknown> = {
      typ: opts.typ,
      an_email: to.join(', '),
      an_name: opts.anName ?? null,
      betreff: opts.betreff,
      inhalt_html: html,
      status: 'gesendet',
      kunde_id: opts.kundeId ?? null,
      lead_id: opts.leadId ?? null,
      angebot_id: opts.angebotId ?? null,
      auftrag_id: opts.auftragId ?? null,
      rechnung_id: opts.rechnungId ?? null,
      gesendet_von: gesendetVon,
      resend_id: resendId,
      anhang_dateiname: attachments?.[0]?.filename ?? null,
      kontext_typ: opts.kontextTyp ?? null,
      richtung: opts.richtung ?? 'gesendet',
      cc_email: ccJoined,
      von_email: opts.vonEmail ?? null,
      in_reply_to_log_id: opts.inReplyToLogId ?? null,
      internet_message_id: opts.internetMessageId ?? null,
    }
    if (opts.emailLogId) insertRow.id = opts.emailLogId

    const { id: loggedId } = await insertEmailLogRow(insertRow)

    return { success: true, resendId, emailLogId: loggedId ?? opts.emailLogId ?? null }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await logMailError(opts, msg)
    return { success: false, error: msg }
  }
}

async function logMailError(opts: SendMailOptions, message: string) {
  const gesendetVon = await resolveGesendetVon()
  const toErr = Array.isArray(opts.an) ? opts.an.join(', ') : opts.an
  const ccErr = normalizeRecipients(opts.cc)?.join(', ') ?? null
  const errRow: Record<string, unknown> = {
    typ: opts.typ,
    an_email: toErr,
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
    anhang_dateiname: opts.pdfName ?? (opts.pdfBuffer ? 'dokument.pdf' : null),
    kontext_typ: opts.kontextTyp ?? null,
    richtung: opts.richtung ?? 'gesendet',
    cc_email: ccErr,
    von_email: opts.vonEmail ?? null,
    in_reply_to_log_id: opts.inReplyToLogId ?? null,
  }
  if (opts.emailLogId) errRow.id = opts.emailLogId
  await insertEmailLogRow(errRow)
}
