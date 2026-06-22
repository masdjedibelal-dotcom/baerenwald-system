import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { runKiHubAnalyze } from '@/lib/ki-hub/analyze'
import { buildPulseCards } from '@/lib/ki-hub/pulse'
import type { KiHubLoadPayload } from '@/lib/ki-hub/types'
import { groupEmpfehlungen } from '@/lib/ki-hub/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  try {
    let existingData: KiHubLoadPayload | undefined
    try {
      const body = (await req.json()) as { data?: KiHubLoadPayload }
      existingData = body.data
    } catch {
      /* leer ok — Server lädt Daten selbst */
    }

    const result = await runKiHubAnalyze(existingData)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 500 })
    }

    const pulse = buildPulseCards(result.data)
    const empfehlungen = groupEmpfehlungen(result.empfehlungen)

    return NextResponse.json({
      ok: true,
      data: result.data,
      pulse,
      empfehlungen,
      analyse_lauf: result.analyse_lauf,
      timestamp: result.data.timestamp,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Analyse fehlgeschlagen'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
