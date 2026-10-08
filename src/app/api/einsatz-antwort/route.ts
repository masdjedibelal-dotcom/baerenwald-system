import { NextResponse } from 'next/server'

import { einsatzBeantworten, verifyTokenFormat } from '@/lib/einsatz/antwort'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Partner nimmt einen Einsatz an / lehnt ab — über den geheimen Link aus der Einsatz-Mail
 * (verifyTokenFormat + Abgleich in der Datenbank; ohne gültigen Schlüssel passiert nichts).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string; antwort?: string; grund?: string } | null
  const token = String(body?.token ?? '')
  const antwort = body?.antwort === 'annehmen' ? 'annehmen' : body?.antwort === 'ablehnen' ? 'ablehnen' : null
  if (!verifyTokenFormat(token) || !antwort) {
    return NextResponse.json({ ok: false, message: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const r = await einsatzBeantworten(getSupabaseAdmin(), token, antwort, body?.grund ?? null)
  if (!r.ok) return NextResponse.json(r, { status: 409 })
  return NextResponse.json(r)
}
