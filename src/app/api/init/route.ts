import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ensureStandardTemplates } from '@/lib/standard-templates'

/** Einmalige/idempotente Anlage der Standard-Formular-Templates. */
export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const r = await ensureStandardTemplates()
  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, inserted: r.inserted, skipped: r.skipped })
}
