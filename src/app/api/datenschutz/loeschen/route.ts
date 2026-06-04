import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { executeDatenschutzLoeschung } from '@/lib/datenschutz/execute-loeschung'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { kategorie?: string; referenz_id?: string; grund?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const kategorie = body.kategorie?.trim()
  const referenz_id = body.referenz_id?.trim()
  const grund = body.grund?.trim() || 'manuell'

  if (!kategorie || !referenz_id) {
    return NextResponse.json({ ok: false, error: 'kategorie und referenz_id erforderlich' }, { status: 400 })
  }

  const res = await executeDatenschutzLoeschung({
    kategorie,
    referenz_id,
    grund,
    userId: user.id,
  })

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.message }, { status: res.code ?? 400 })
  }

  return NextResponse.json({ ok: true })
}
