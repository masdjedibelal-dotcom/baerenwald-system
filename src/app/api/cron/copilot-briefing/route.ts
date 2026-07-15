import { NextRequest, NextResponse } from 'next/server'
import { buildBriefing } from '@/lib/copilot/briefing'
import { sendTelegram } from '@/lib/copilot/telegram'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const briefing = await buildBriefing()
    await sendTelegram(briefing)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Briefing fehlgeschlagen'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
