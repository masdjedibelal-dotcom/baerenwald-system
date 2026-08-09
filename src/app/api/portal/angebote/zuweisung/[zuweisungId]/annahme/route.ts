import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { acceptHandwerkerZuweisung } from '@/lib/angebote/handwerker-annahme'
import { isHandwerkerAblehnungGrund } from '@/lib/angebote/ablehnung-labels'

async function portalHandwerkerId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('handwerker').select('id').eq('auth_user_id', user.id).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

type Body =
  | { antwort: 'akzeptiert'; notiz?: string }
  | { antwort: 'abgelehnt'; grund: string; notiz?: string }

/**
 * Portal-Pfad für HW-Annahme/Ablehnung — schreibt denselben Status wie Token/CRM (V1).
 * POST /api/portal/angebote/zuweisung/[zuweisungId]/annahme
 */
export async function POST(
  req: Request,
  { params }: { params: { zuweisungId: string } }
) {
  const hwId = await portalHandwerkerId()
  if (!hwId) {
    return NextResponse.json({ error: 'Nicht angemeldet oder kein Partner-Konto.' }, { status: 401 })
  }

  const zuweisungId = params.zuweisungId?.trim()
  if (!zuweisungId) {
    return NextResponse.json({ error: 'Zuweisung fehlt.' }, { status: 400 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
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

  const r = await acceptHandwerkerZuweisung({
    zuweisungId,
    antwort: body.antwort,
    notiz: body.notiz,
    ablehnungGrund: body.antwort === 'abgelehnt' ? body.grund : null,
    quelle: 'portal',
    handwerkerId: hwId,
  })

  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: r.httpStatus ?? 400 })
  }

  return NextResponse.json({ ok: true, status: r.status, already: r.already === true })
}
