import { NextRequest, NextResponse } from 'next/server'
import { syncMarketingMetrics } from '@/lib/ki-hub/marketing-metrics'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncMarketingMetrics()
  return NextResponse.json(result)
}
