import { NextResponse } from 'next/server'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

/**
 * Portal → CRM: Ping dass Partner Positionsmeldung / Weitere Arbeit angelegt hat.
 * Glocke liest aus DB (partner_positions_anfragen / anerkennung_status).
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

  const typ =
    body.typ === 'weitere_arbeit' ? 'weitere_arbeit' : 'positions_anfrage'

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion:
      typ === 'weitere_arbeit'
        ? 'partner_weitere_arbeit_ping'
        : 'partner_positions_anfrage_ping',
    actorRolle: 'system',
    payload: {
      anfrage_id: body.anfrageId ?? null,
      position_id: body.positionId ?? null,
      titel: body.titel ?? null,
    },
  })

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'handwerker_update',
    titel:
      typ === 'weitere_arbeit'
        ? 'Weitere Arbeit gemeldet'
        : 'Nachtrag / neue Position gemeldet',
    beschreibung: String(body.titel ?? '').slice(0, 500) || null,
    sichtbar_fuer_kunde: false,
  })

  // Existenz prüfen — verhindert stille Falsch-IDs
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) {
    return NextResponse.json({ ok: false, error: 'Auftrag unbekannt' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
