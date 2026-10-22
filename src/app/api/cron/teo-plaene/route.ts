import { NextRequest, NextResponse } from 'next/server'

import { funktionAn, MARKE } from '@/lib/marke'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = req.headers.get('authorization')
  return h === `Bearer ${secret}`
}

function portalBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.FRONTEND_URL?.trim() || MARKE.portalUrl).replace(/\/$/, '')
}

/** Servus TEO: fällige Pläne „TEO erledigt“ → Vorgang an TEO (Logik im Portal, dort `persistLead`). */
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!funktionAn('hvWorkflow')) return NextResponse.json({ ok: true, skipped: 'nicht-teo' })
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return NextResponse.json({ ok: false, error: 'PARTNER_INTERNAL_API_SECRET fehlt' }, { status: 500 })

  try {
    const res = await fetch(`${portalBaseUrl()}/api/internal/teo-plaene`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return NextResponse.json({ ok: res.ok, status: res.status, ...body }, { status: res.ok ? 200 : 502 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    console.error('[cron/teo-plaene]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
