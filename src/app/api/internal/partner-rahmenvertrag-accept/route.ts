import { NextResponse } from 'next/server'
import { acceptRahmenvertragFromPortal } from '@/lib/vertraege/provision-rahmenvertrag-portal'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/** Website → CRM: Rahmenvertrag nach Registrierungs-Annahme finalisieren (ohne Partner-JWT). */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { handwerker_id?: string; email?: string } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  let handwerkerId = body.handwerker_id?.trim() ?? ''
  if (!handwerkerId && body.email?.trim()) {
    const email = body.email.trim().toLowerCase()
    const { data } = await supabaseAdmin
      .from('handwerker')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    handwerkerId = (data?.id as string | undefined) ?? ''
  }

  if (!handwerkerId) {
    return NextResponse.json({ ok: false, error: 'handwerker_id oder email fehlt' }, { status: 400 })
  }

  const r = await acceptRahmenvertragFromPortal({ handwerkerId })
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    vertrag_id: r.vertrag_id,
    vertrags_nr: r.vertrags_nr,
    pdf_url: r.pdf_url,
    bereits_akzeptiert: r.bereitsAkzeptiert,
  })
}
