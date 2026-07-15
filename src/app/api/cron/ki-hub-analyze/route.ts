import { NextRequest, NextResponse } from 'next/server'
import { runKiHubAnalyze } from '@/lib/ki-hub/analyze'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runKiHubAnalyze()
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    analyse_lauf: result.analyse_lauf,
    count: result.empfehlungen.length,
  })
}
