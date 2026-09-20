import { revalidateLeadDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertEmailLogRow } from '@/lib/kommunikation/insert-email-log'
import { parseEmailLogIdFromHtml } from '@/lib/kommunikation/types'
import { logLeadEmailTimelineEvent } from '@/lib/kommunikation/log-lead-email-timeline'

type ResendInboundPayload = {
  type?: string
  data?: {
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

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: ResendInboundPayload
  try {
    body = (await req.json()) as ResendInboundPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.type !== 'email.received' || !body.data) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const data = body.data
  const parentId = await findParentLogId(data)
  if (!parentId) {
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
