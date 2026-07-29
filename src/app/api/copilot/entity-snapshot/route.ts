import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { buildEntityPageSnapshot } from '@/lib/copilot/entity-snapshot'

export const dynamic = 'force-dynamic'

/** Reicher Entity-Snapshot für die aktuelle CRM-Seite (Assistent-Kontext). */
export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Nicht angemeldet' }, { status: 401 })
  }

  const url = new URL(req.url)
  const path = url.searchParams.get('path') || '/'
  const snapshot = await buildEntityPageSnapshot(path)
  return NextResponse.json({
    ok: true,
    snapshot: snapshot,
  })
}
