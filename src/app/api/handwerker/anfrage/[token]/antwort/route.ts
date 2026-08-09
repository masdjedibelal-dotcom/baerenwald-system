import { NextResponse } from 'next/server'
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import { buildInternHandwerkerAntwortMail } from '@/lib/angebote/angebot-mail-templates'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { sendMail } from '@/lib/mail-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

type AntwortBody =
  | { antwort: 'akzeptiert'; notiz?: string }
  | { antwort: 'abgelehnt'; grund: string; notiz?: string }

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim()
  if (!token) {
    return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
  }

  let body: AntwortBody
  try {
    body = (await req.json()) as AntwortBody
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (body.antwort !== 'akzeptiert' && body.antwort !== 'abgelehnt') {
    return NextResponse.json({ error: 'Ungültige Antwort' }, { status: 400 })
  }
  if (body.antwort === 'abgelehnt') {
    if (!body.grund || !isHandwerkerAblehnungGrund(body.grund)) {
      return NextResponse.json({ error: 'Ablehnungsgrund fehlt oder ungültig' }, { status: 400 })
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      gewerk_id,
      handwerker_id,
      status,
      antwort_at,
      handwerker(name),
      gewerke(name),
      angebote(id, lead_id)
    `
    )
    .eq('token', token)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Link ungültig' }, { status: 404 })
  }

  const raw = row as Record<string, unknown>
  if (raw.antwort_at) {
    return NextResponse.json({ error: 'Bereits beantwortet' }, { status: 409 })
  }

  const st = String(raw.status ?? '').toLowerCase()
  if (st === 'akzeptiert' || st === 'abgelehnt' || st === 'ersetzt') {
    return NextResponse.json({ error: 'Bereits beantwortet' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const notiz = body.notiz?.trim() || null
  const angenommen = body.antwort === 'akzeptiert'
  const status = angenommen ? 'akzeptiert' : 'abgelehnt'
  const ablehnungGrund = !angenommen && body.antwort === 'abgelehnt' ? body.grund : null

  const { error: updErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      status,
      antwort_at: now,
      antwort_notiz: notiz,
      ablehnung_grund: ablehnungGrund,
    })
    .eq('id', raw.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  const angebot = one(raw.angebote) as { id: string; lead_id: string | null } | null
  const hw = one(raw.handwerker) as { name: string } | null
  const gw = one(raw.gewerke) as { name: string } | null
  const handwerkerName = hw?.name?.trim() || 'Handwerker'
  const gewerkName = gw?.name?.trim() || 'Gewerk'
  const grundLabel =
    ablehnungGrund && isHandwerkerAblehnungGrund(ablehnungGrund)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[ablehnungGrund]
      : null

  if (angenommen && raw.angebot_id && raw.gewerk_id) {
    const { data: parallel } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id, handwerker_id, status, handwerker(name)')
      .eq('angebot_id', raw.angebot_id)
      .eq('gewerk_id', raw.gewerk_id)
      .neq('id', raw.id)

    for (const other of parallel ?? []) {
      const otherSt = String(other.status ?? '').toLowerCase()
      if (otherSt === 'akzeptiert' || otherSt === 'abgelehnt' || otherSt === 'ersetzt') continue
      await supabaseAdmin
        .from('angebot_handwerker')
        .update({ status: 'ersetzt', antwort_at: now })
        .eq('id', other.id)

      if (angebot?.lead_id) {
        const otherHw = one(
          (other as { handwerker?: { name: string } | { name: string }[] | null }).handwerker
        ) as { name: string } | null
        await insertLeadTimelineEvent(supabaseAdmin, {
          lead_id: angebot.lead_id,
          angebot_id: angebot.id,
          typ: 'handwerker',
          titel: 'Handwerker nicht gewählt',
          beschreibung: `${otherHw?.name?.trim() || 'Handwerker'} · ${gewerkName}`,
        })
      }
    }
  }

  if (angebot?.lead_id) {
    await insertLeadTimelineEvent(supabaseAdmin, {
      lead_id: angebot.lead_id,
      angebot_id: angebot.id,
      typ: 'handwerker',
      titel: angenommen ? 'Handwerker hat zugesagt' : 'Handwerker hat abgelehnt',
      beschreibung: [
        `${handwerkerName} · ${gewerkName}`,
        grundLabel,
        notiz,
      ]
        .filter(Boolean)
        .join(' — '),
    })
  }

  const { data: einRows } = await supabaseAdmin.from('einstellungen').select('key, value')
  const einMap = new Map((einRows ?? []).map((x) => [x.key as string, String(x.value ?? '')]))
  const internTo = einMap.get('email')?.trim() || 'info@baerenwaldmuenchen.de'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://crm.baerenwaldmuenchen.de'
  const dashboardUrl = angebot?.id ? `${baseUrl}/angebote/${angebot.id}` : `${baseUrl}/angebote`

  void sendMail({
    an: internTo,
    betreff: angenommen
      ? `Handwerker zugesagt: ${gewerkName}`
      : `Handwerker abgelehnt: ${gewerkName}`,
    html: buildInternHandwerkerAntwortMail({
      handwerkerName,
      gewerkName,
      angenommen,
      ablehnungGrund: grundLabel,
      notiz,
      dashboardUrl,
    }),
    typ: 'system',
  })

  return NextResponse.json({ ok: true })
}
