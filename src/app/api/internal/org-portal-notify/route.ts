import { NextResponse } from 'next/server'
import { notifyInterneNeueMeldung, notifyOrgFreigabeErgebnis } from '@/lib/org/org-mail-notify'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/** Website → CRM: interne Meldung-Benachrichtigung nach hv_melder_link. */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leadId?: string; typ?: string; aktion?: string; notiz?: string } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const leadId = String(body.leadId ?? '').trim()
  if (!leadId) {
    return NextResponse.json({ ok: false, error: 'leadId fehlt' }, { status: 400 })
  }

  if (body.typ === 'freigabe_ergebnis') {
    const aktion = body.aktion === 'abgelehnt' ? 'abgelehnt' : 'freigegeben'
    const res = await notifyOrgFreigabeErgebnis({ leadId, aktion, notiz: body.notiz })
    if (!res.ok) return NextResponse.json({ ok: false, error: res.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const res = await notifyInterneNeueMeldung(leadId)
  if (!res.ok) return NextResponse.json({ ok: false, error: res.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
