import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { acceptRahmenvertragFromPortal } from '@/lib/vertraege/provision-rahmenvertrag-portal'

async function portalHandwerkerId(supabase: ReturnType<typeof createClient>): Promise<{
  id: string
  userId: string
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('handwerker').select('id').eq('auth_user_id', user.id).maybeSingle()
  const id = (data?.id as string | undefined) ?? ''
  if (!id) return null
  return { id, userId: user.id }
}

/** POST: Eingeloggter Partner bestätigt Rahmenvertrag (Profil) — PDF wird bei Bedarf erzeugt. */
export async function POST() {
  const supabase = createClient()
  const hw = await portalHandwerkerId(supabase)
  if (!hw) {
    return NextResponse.json({ error: 'Nicht angemeldet oder kein Partner-Konto.' }, { status: 401 })
  }

  const r = await acceptRahmenvertragFromPortal({
    handwerkerId: hw.id,
    authUserId: hw.userId,
  })
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })

  return NextResponse.json({
    vertrag_id: r.vertrag_id,
    vertrags_nr: r.vertrags_nr,
    pdf_url: r.pdf_url,
  })
}
