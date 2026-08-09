import { NextResponse } from 'next/server'
import { acceptHandwerkerZuweisung } from '@/lib/angebote/handwerker-annahme'
import { isHandwerkerAblehnungGrund } from '@/lib/angebote/ablehnung-labels'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

type Body =
  | {
      antwort: 'akzeptiert'
      zuweisungId: string
      handwerkerId: string
      notiz?: string
    }
  | {
      antwort: 'abgelehnt'
      zuweisungId: string
      handwerkerId: string
      grund: string
      notiz?: string
    }

/**
 * Portal → CRM: kanonische HW-Annahme (Q2, analog org-portal-notify).
 * POST /api/internal/partner-annahme
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const zuweisungId = String(body.zuweisungId ?? '').trim()
  const handwerkerId = String(body.handwerkerId ?? '').trim()
  if (!zuweisungId || !handwerkerId) {
    return NextResponse.json(
      { ok: false, error: 'zuweisungId und handwerkerId erforderlich' },
      { status: 400 }
    )
  }

  if (body.antwort !== 'akzeptiert' && body.antwort !== 'abgelehnt') {
    return NextResponse.json({ ok: false, error: 'Ungültige Antwort' }, { status: 400 })
  }
  if (body.antwort === 'abgelehnt') {
    if (!body.grund || !isHandwerkerAblehnungGrund(body.grund)) {
      return NextResponse.json(
        { ok: false, error: 'Ablehnungsgrund fehlt oder ungültig' },
        { status: 400 }
      )
    }
  }

  const r = await acceptHandwerkerZuweisung({
    zuweisungId,
    antwort: body.antwort,
    notiz: body.notiz,
    ablehnungGrund: body.antwort === 'abgelehnt' ? body.grund : null,
    quelle: 'portal',
    handwerkerId,
  })

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.message },
      { status: r.httpStatus ?? 400 }
    )
  }

  return NextResponse.json({ ok: true, status: r.status, already: r.already === true })
}
