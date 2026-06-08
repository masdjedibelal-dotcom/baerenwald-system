import { NextRequest, NextResponse } from 'next/server'
import { runKiAnalyseScript } from '@/lib/ki/run-analyse'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['preise_margen', 'handwerker', 'gewerke', 'produkte', 'claude', 'all', 'all_claude'])

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let bereich = 'preise_margen'
  try {
    const body = (await req.json()) as { bereich?: string }
    if (body.bereich) bereich = body.bereich
  } catch {
    /* leerer Body ok */
  }

  if (!ALLOWED.has(bereich)) {
    return NextResponse.json({ error: 'Unbekannter Bereich' }, { status: 400 })
  }

  if (bereich === 'all' || bereich === 'all_claude') {
    const errors: string[] = []
    for (const key of ['preise_margen', 'handwerker', 'gewerke', 'produkte']) {
      const result = await runKiAnalyseScript(key)
      if (!result.ok) errors.push(`${key}: ${result.message}`)
    }
    if (bereich === 'all_claude') {
      const claude = await runKiAnalyseScript('claude')
      if (!claude.ok) errors.push(`claude: ${claude.message}`)
    }
    if (errors.length) {
      return NextResponse.json({ error: errors.join(' · ') }, { status: 500 })
    }
    return NextResponse.json({ ok: true, bereich })
  }

  const result = await runKiAnalyseScript(bereich)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bereich })
}
