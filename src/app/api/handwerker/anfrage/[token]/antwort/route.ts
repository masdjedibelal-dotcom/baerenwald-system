import { NextResponse } from 'next/server'
import { acceptHandwerkerZuweisung } from '@/lib/angebote/handwerker-annahme'
import { isHandwerkerAblehnungGrund } from '@/lib/angebote/ablehnung-labels'

type AntwortBody =
  | { antwort: 'akzeptiert'; notiz?: string }
  | { antwort: 'abgelehnt'; grund: string; notiz?: string }

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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: row, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (error || !row?.id) {
    return NextResponse.json({ error: 'Link ungültig' }, { status: 404 })
  }

  const r = await acceptHandwerkerZuweisung({
    zuweisungId: String(row.id),
    antwort: body.antwort,
    notiz: body.notiz,
    ablehnungGrund: body.antwort === 'abgelehnt' ? body.grund : null,
    quelle: 'token',
  })

  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: r.httpStatus ?? 400 })
  }

  return NextResponse.json({ ok: true })
}
