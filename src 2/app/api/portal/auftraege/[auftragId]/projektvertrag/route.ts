import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  confirmPortalProjektvertrag,
  loadPortalProjektvertragPreview,
} from '@/lib/vertraege/portal-projektvertrag'

async function portalHandwerkerId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('handwerker').select('id').eq('auth_user_id', user.id).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

/** GET: Vorschau für Partner-Bestätigung im Portal */
export async function GET(
  _req: Request,
  { params }: { params: { auftragId: string } }
) {
  const supabase = createClient()
  const handwerkerId = await portalHandwerkerId(supabase)
  if (!handwerkerId) {
    return NextResponse.json({ error: 'Nicht angemeldet oder kein Partner-Konto.' }, { status: 401 })
  }

  const r = await loadPortalProjektvertragPreview(params.auftragId, handwerkerId)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
  return NextResponse.json(r.preview)
}

/** POST: Partner bestätigt Auftrag → Projektvertrag-PDF wird erzeugt (digitale Annahme) */
export async function POST(
  _req: Request,
  { params }: { params: { auftragId: string } }
) {
  const supabase = createClient()
  const handwerkerId = await portalHandwerkerId(supabase)
  if (!handwerkerId) {
    return NextResponse.json({ error: 'Nicht angemeldet oder kein Partner-Konto.' }, { status: 401 })
  }

  const r = await confirmPortalProjektvertrag(params.auftragId, handwerkerId)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
  return NextResponse.json({
    vertrag_id: r.vertrag_id,
    vertrags_nr: r.vertrags_nr,
    pdf_url: r.pdf_url,
  })
}
