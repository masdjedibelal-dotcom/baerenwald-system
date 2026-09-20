import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeHwFormularStatusByToken } from '@/lib/status/write-hw-formular-status'

export async function PATCH(
  req: Request,
  { params }: { params: { token: string } }
) {
  let body: { felder_werte?: Record<string, unknown>; foto_urls?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const { error } = await writeHwFormularStatusByToken(supabaseAdmin, params.token, 'ausgefuellt', {
    felder_werte: body.felder_werte ?? {},
    ...(Array.isArray(body.foto_urls) ? { foto_urls: body.foto_urls } : {}),
  })
  if (error) logDbError('app/api/formular/[token]/route:hw_formular_einreichungen', error)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
