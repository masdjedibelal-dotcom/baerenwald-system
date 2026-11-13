import { revalidateLeadDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

import { auftragAusMail, auftragsKennungAusEmpfaengern, ladeEingehendeMail } from '@/teo/hv/auftrag-per-mail'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertEmailLogRow } from '@/lib/kommunikation/insert-email-log'
import { parseEmailLogIdFromHtml } from '@/lib/kommunikation/types'
import { logLeadEmailTimelineEvent } from '@/lib/kommunikation/log-lead-email-timeline'

type ResendInboundPayload = {
  type?: string
  data?: {
    email_id?: string
    received_for?: string[]
    from?: string
    to?: string | string[]
    subject?: string
    html?: string
    text?: string
    message_id?: string
    in_reply_to?: string | null
    headers?: Record<string, string | string[]>
  }
}

async function findParentLogId(data: NonNullable<ResendInboundPayload['data']>): Promise<string | null> {
  const inReplyTo = data.in_reply_to?.trim()
  if (inReplyTo) {
    const {data: byResend, error: error1} = await supabaseAdmin
      .from('email_log')
      .select('id')
      .eq('resend_id', inReplyTo)
      .maybeSingle()
    if (error1) logDbError('app/api/webhooks/resend/route:email_log', error1)
    if (byResend?.id) return byResend.id as string

    const {data: byMsg, error: error2} = await supabaseAdmin
      .from('email_log')
      .select('id')
      .eq('internet_message_id', inReplyTo)
      .maybeSingle()
    if (error2) logDbError('app/api/webhooks/resend/route:email_log', error2)
    if (byMsg?.id) return byMsg.id as string
  }

  const html = data.html ?? ''
  const fromMarker = parseEmailLogIdFromHtml(html)
  if (fromMarker) return fromMarker

  const text = data.text ?? ''
  return parseEmailLogIdFromHtml(text)
}

/** Echt von Resend? Bearer (alt) oder Svix-Signatur (Resend-Webhook-Secret „whsec_…“). */
function pruefeHerkunft(req: Request, roh: string): { ok: boolean; verifiziert: boolean } {
  const bearer = process.env.RESEND_WEBHOOK_SECRET?.trim()
  const signing = process.env.RESEND_WEBHOOK_SIGNING_SECRET?.trim()
  const auth = req.headers.get('authorization') ?? ''
  if (bearer && auth === `Bearer ${bearer}`) return { ok: true, verifiziert: true }
  if (signing && req.headers.get('svix-signature')) {
    try {
      new Resend('re_unused').webhooks.verify({
        payload: roh,
        headers: {
          id: req.headers.get('svix-id') ?? '',
          timestamp: req.headers.get('svix-timestamp') ?? '',
          signature: req.headers.get('svix-signature') ?? '',
        },
        webhookSecret: signing,
      })
      return { ok: true, verifiziert: true }
    } catch {
      return { ok: false, verifiziert: false }
    }
  }
  // Ohne konfigurierte Secrets: Antwort-Zuordnung wie bisher erlaubt, aber nichts Neues anlegen
  if (!bearer && !signing) return { ok: true, verifiziert: false }
  return { ok: false, verifiziert: false }
}

export async function POST(req: Request) {
  const roh = await req.text()
  const herkunft = pruefeHerkunft(req, roh)
  if (!herkunft.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ResendInboundPayload
  try {
    body = JSON.parse(roh) as ResendInboundPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.type !== 'email.received' || !body.data) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Webhook liefert nur Eckdaten — Text/HTML/Header bei Resend nachladen
  const voll = body.data.email_id ? await ladeEingehendeMail(body.data.email_id) : null
  const data: NonNullable<ResendInboundPayload['data']> = voll
    ? {
        ...body.data,
        from: voll.from,
        to: voll.to,
        subject: voll.subject,
        html: voll.html ?? undefined,
        text: voll.text ?? undefined,
        message_id: voll.messageId ?? body.data.message_id,
        in_reply_to: body.data.in_reply_to ?? voll.inReplyTo ?? null,
      }
    : body.data
  const parentId = await findParentLogId(data)
  if (!parentId) {
    const empfaenger = [...(Array.isArray(data.to) ? data.to : [data.to ?? '']), ...(body.data.received_for ?? [])].filter(Boolean)
    const kennung = auftragsKennungAusEmpfaengern(empfaenger)
    if (kennung !== null && herkunft.verifiziert && voll) {
      const r = await auftragAusMail(voll, kennung)
      if (!r.ok) return NextResponse.json({ error: r.message }, { status: 500 })
      return NextResponse.json(r)
    }
    return NextResponse.json({ ok: true, unmatched: true })
  }

  const {data: parent, error: error3} = await supabaseAdmin
    .from('email_log')
    .select(
      'id, kunde_id, lead_id, angebot_id, auftrag_id, rechnung_id, kontext_typ, an_email'
    )
    .eq('id', parentId)
    .maybeSingle()
  if (error3) logDbError('app/api/webhooks/resend/route:email_log', error3)

  if (!parent) {
    return NextResponse.json({ ok: true, parent_missing: true })
  }

  const from = (data.from ?? '').trim()
  const toArr = Array.isArray(data.to) ? data.to : [data.to ?? '']
  const toJoined = toArr.filter(Boolean).join(', ')
  const html =
    data.html ??
    (data.text
      ? `<pre style="font-family:sans-serif;white-space:pre-wrap">${data.text.replace(/</g, '&lt;')}</pre>`
      : '')

  const { id: insertedId, error: error4 } = await insertEmailLogRow({
    typ: parent.kontext_typ ? `antwort_${parent.kontext_typ}` : 'antwort',
    kontext_typ: parent.kontext_typ,
    richtung: 'empfangen',
    an_email: toJoined || (parent.an_email as string),
    von_email: from,
    betreff: (data.subject ?? '').trim() || '(Kein Betreff)',
    inhalt_html: html,
    status: 'empfangen',
    kunde_id: parent.kunde_id,
    lead_id: parent.lead_id,
    angebot_id: parent.angebot_id,
    auftrag_id: parent.auftrag_id,
    rechnung_id: parent.rechnung_id,
    in_reply_to_log_id: parentId,
    internet_message_id: data.message_id ?? null,
  })

  if (error4) {
    console.error('[resend-webhook]', error4)
    return NextResponse.json({ error: error4 }, { status: 500 })
  }

  const leadId = parent.lead_id as string | null
  if (leadId && insertedId) {
    await logLeadEmailTimelineEvent({
      leadId,
      emailLogId: insertedId,
      titel: 'Antwort vom Kunden',
      beschreibung: (data.subject ?? '').trim() || from || '(Kein Betreff)',
    })
    revalidateLeadDetail(leadId)
  }

  return NextResponse.json({ ok: true })
}
