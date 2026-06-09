import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { loadKiHubData } from '@/lib/ki-hub/load-data'
import { buildPulseCards } from '@/lib/ki-hub/pulse'
import { groupEmpfehlungen } from '@/lib/ki-hub/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  try {
    const data = await loadKiHubData()
    const pulse = buildPulseCards(data)
    const empfehlungen = groupEmpfehlungen(data.supabase.empfehlungen_heute)
    const analyseLauf =
      data.supabase.empfehlungen_heute[0]?.analyse_lauf ?? null

    return NextResponse.json({
      ok: true,
      data,
      pulse,
      empfehlungen,
      analyse_lauf: analyseLauf,
      timestamp: data.timestamp,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Laden fehlgeschlagen'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
