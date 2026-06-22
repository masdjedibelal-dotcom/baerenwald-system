import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  const { error } = await supabaseAdmin
    .from('hw_formular_einreichungen')
    .update({
      felder_werte: body.felder_werte ?? {},
      ...(Array.isArray(body.foto_urls) ? { foto_urls: body.foto_urls } : {}),
      status: 'ausgefuellt',
    })
    .eq('token', params.token)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
