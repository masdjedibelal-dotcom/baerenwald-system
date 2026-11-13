import { NextResponse } from 'next/server'

import { funktionAn } from '@/lib/marke'
import { freigabePerTokenEntscheiden, verifyFreigabeTokenFormat } from '@/teo/hv/freigabe-per-mail'

/**
 * Verwaltung gibt ein Angebot über ihrer Grenze frei / lehnt ab — über den geheimen Link
 * aus der Freigabe-Mail (ohne Login; ohne gültigen, offenen Schlüssel passiert nichts).
 */
export async function POST(req: Request) {
  if (!funktionAn('hvWorkflow')) return NextResponse.json({ ok: false, message: 'Nicht verfügbar.' }, { status: 404 })
  const body = (await req.json().catch(() => null)) as { token?: string; aktion?: string; notiz?: string } | null
  const token = String(body?.token ?? '')
  const aktion = body?.aktion === 'freigegeben' ? 'freigegeben' : body?.aktion === 'abgelehnt' ? 'abgelehnt' : null
  if (!verifyFreigabeTokenFormat(token) || !aktion) {
    return NextResponse.json({ ok: false, message: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const r = await freigabePerTokenEntscheiden(token, aktion, body?.notiz ?? null)
  if (!r.ok) return NextResponse.json(r, { status: 409 })
  return NextResponse.json(r)
}
