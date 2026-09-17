import { NextResponse } from 'next/server'

import { recordHwAuftragErledigtGemeldet } from '@/lib/auftraege/record-hw-auftrag-erledigt'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/**
 * Portal → CRM: Partner meldet Auftrag erledigt.
 * Setzt `auftrag_handwerker.erledigt_gemeldet_am` → Glocke `hw_auftrag_erledigt`.
 *
 * Body: { auftragId, handwerkerId, erledigtAm? }
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    auftragId?: string
    handwerkerId?: string
    erledigtAm?: string
  } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const auftragId = String(body.auftragId ?? '').trim()
  const handwerkerId = String(body.handwerkerId ?? '').trim()
  if (!auftragId || !handwerkerId) {
    return NextResponse.json(
      { ok: false, error: 'auftragId und handwerkerId erforderlich' },
      { status: 400 }
    )
  }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) {
    return NextResponse.json({ ok: false, error: 'Auftrag unbekannt' }, { status: 404 })
  }

  const recorded = await recordHwAuftragErledigtGemeldet({
    auftragId,
    handwerkerId,
    erledigtAm: body.erledigtAm ?? null,
  })
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, error: recorded.message }, { status: 400 })
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_auftrag_erledigt',
    actorRolle: 'system',
    payload: {
      handwerker_id: handwerkerId,
      erledigt_gemeldet_am: recorded.erledigtAm,
    },
  })

  return NextResponse.json({ ok: true, erledigtAm: recorded.erledigtAm })
}
