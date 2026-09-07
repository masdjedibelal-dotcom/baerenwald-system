import { NextResponse } from 'next/server'

import type { CrmNotificationTyp } from '@/app/(dashboard)/notifications/actions'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { sendCrmPushToStaff } from '@/lib/push/send'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/**
 * Portal → CRM: Ping dass Partner Positionsmeldung / Weitere Arbeit /
 * Leistungs-Update angelegt hat.
 * Glocke liest Updates zusätzlich aus position_eintraege.
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    auftragId?: string
    anfrageId?: string
    positionId?: string
    typ?: string
    titel?: string
    handwerkerId?: string
    leistungName?: string
    beschreibung?: string
  } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const auftragId = String(body.auftragId ?? '').trim()
  if (!auftragId) {
    return NextResponse.json({ ok: false, error: 'auftragId fehlt' }, { status: 400 })
  }

  const rawTyp = String(body.typ ?? '').trim().toLowerCase()
  const typ =
    rawTyp === 'weitere_arbeit'
      ? 'weitere_arbeit'
      : rawTyp === 'leistung_update' || rawTyp === 'fortschritt' || rawTyp === 'update'
        ? 'leistung_update'
        : 'positions_anfrage'

  const positionId = String(body.positionId ?? '').trim() || null
  const titel = String(body.titel ?? '').trim() || null
  const leistungName = String(body.leistungName ?? '').trim() || null
  const beschreibung = String(body.beschreibung ?? '').trim() || null
  const handwerkerId = String(body.handwerkerId ?? '').trim() || null

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion:
      typ === 'weitere_arbeit'
        ? 'partner_weitere_arbeit_ping'
        : typ === 'leistung_update'
          ? 'partner_leistung_update_ping'
          : 'partner_positions_anfrage_ping',
    actorRolle: 'system',
    payload: {
      anfrage_id: body.anfrageId ?? null,
      position_id: positionId,
      titel,
      leistung_name: leistungName,
    },
  })

  if (typ !== 'leistung_update') {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'handwerker_update',
      titel:
        typ === 'weitere_arbeit'
          ? 'Weitere Arbeit gemeldet'
          : 'Nachtrag / neue Position gemeldet',
      beschreibung: (titel || beschreibung || '').slice(0, 500) || null,
      sichtbar_fuer_kunde: false,
      handwerker_id: handwerkerId,
    })
  }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) {
    return NextResponse.json({ ok: false, error: 'Auftrag unbekannt' }, { status: 404 })
  }

  let hwName = 'Handwerker'
  if (handwerkerId) {
    const { data: hw } = await supabaseAdmin
      .from('handwerker')
      .select('name')
      .eq('id', handwerkerId)
      .maybeSingle()
    hwName = String(hw?.name ?? '').trim() || hwName
  }

  if (typ === 'leistung_update') {
    const pushTyp: CrmNotificationTyp = 'handwerker_update'
    const pushTitle = leistungName
      ? `${hwName}: Update zu Leistung „${leistungName}“`
      : `${hwName}: Update zu Leistung`
    const pushBody =
      beschreibung ||
      titel ||
      'Neuer Eintrag vom Partner unter Leistungen.'
    const href = `/auftraege/${auftragId}?tab=leistungen${
      positionId ? `&position=${encodeURIComponent(positionId)}` : ''
    }`
    void sendCrmPushToStaff({
      typ: pushTyp,
      title: pushTitle,
      body: pushBody.slice(0, 180),
      url: href,
      tag: `leistung-update-${auftragId}-${positionId || 'all'}-${Date.now()}`,
    }).catch((e) => console.warn('[partner-positions-meldung] push', e))
  }

  return NextResponse.json({ ok: true })
}
