import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildInternHandwerkerAntwortMail } from '@/lib/angebote/angebot-mail-templates'
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import { sendInternNotifyEmail } from '@/lib/angebote/emails'
import { getPublicAppUrl } from '@/lib/utils'

type Body = {
  antwort: 'akzeptiert' | 'abgelehnt'
  /** Pflicht bei antwort abgelehnt — Schlüssel aus HANDWERKER_ABLEHNUNG_GRUND_* */
  grund?: string
  notiz?: string
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim()
  if (!token) {
    return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  if (body.antwort !== 'akzeptiert' && body.antwort !== 'abgelehnt') {
    return NextResponse.json({ error: 'antwort muss akzeptiert oder abgelehnt sein' }, { status: 400 })
  }

  const grundRaw = body.grund?.trim() ?? ''
  if (body.antwort === 'abgelehnt') {
    if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
      return NextResponse.json(
        { error: 'Bitte einen gültigen Ablehnungsgrund auswählen.' },
        { status: 400 }
      )
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      antwort_at,
      status,
      handwerker(name),
      gewerke(name)
    `
    )
    .eq('token', token)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Dieser Link ist nicht mehr gültig.' }, { status: 404 })
  }

  const raw = row as Record<string, unknown>
  const one = <T,>(x: T | T[] | null | undefined): T | null => {
    if (x == null) return null
    return Array.isArray(x) ? (x[0] as T) ?? null : x
  }

  const r = {
    id: String(raw.id),
    angebot_id: String(raw.angebot_id),
    antwort_at: (raw.antwort_at as string | null) ?? null,
    handwerker: one(raw.handwerker) as { name: string } | null,
    gewerke: one(raw.gewerke) as { name: string } | null,
  }

  if (r.antwort_at) {
    return NextResponse.json({ error: 'Sie haben bereits geantwortet.' }, { status: 400 })
  }

  const notiz = body.notiz?.trim() || null
  const ablehnungGrundDb = body.antwort === 'abgelehnt' && isHandwerkerAblehnungGrund(grundRaw) ? grundRaw : null
  const newStatus = body.antwort === 'akzeptiert' ? 'akzeptiert' : 'abgelehnt'
  const now = new Date().toISOString()

  const { error: upErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      status: newStatus,
      antwort_at: now,
      antwort_notiz: notiz,
      ablehnung_grund: ablehnungGrundDb,
    })
    .eq('id', r.id)
    .is('antwort_at', null)

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const hwName = r.handwerker?.name?.trim() || 'Handwerkerin'
  const gwName = r.gewerke?.name?.trim() || 'Gewerk'
  const angebotId = r.angebot_id
  const dashboardUrl = `${getPublicAppUrl()}/angebote/${angebotId}`

  const subject =
    body.antwort === 'akzeptiert'
      ? `${hwName} hat angenommen`
      : `${hwName} hat abgelehnt — ${gwName}`

  const grundLabel =
    ablehnungGrundDb && isHandwerkerAblehnungGrund(ablehnungGrundDb)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[ablehnungGrundDb]
      : null

  const html = buildInternHandwerkerAntwortMail({
    handwerkerName: hwName,
    gewerkName: gwName,
    angenommen: body.antwort === 'akzeptiert',
    ablehnungGrund: grundLabel,
    notiz,
    dashboardUrl,
  })

  await sendInternNotifyEmail({ subject, html })

  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/angebote')

  return NextResponse.json({ ok: true })
}
