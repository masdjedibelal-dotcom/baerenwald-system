import { NextRequest, NextResponse } from 'next/server'
import { sendZahlungserinnerungen } from '@/app/actions/mails'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = req.headers.get('authorization')
  return h === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const r = await sendZahlungserinnerungen()
  return NextResponse.json({
    ok: true,
    bearbeitet: r.bearbeitet,
    details: r.details,
  })
}
