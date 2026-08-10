import { NextResponse } from 'next/server'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { sendCrmPushToStaff } from '@/lib/push/send'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { CrmNotificationTyp } from '@/app/(dashboard)/notifications/actions'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

type UploadTyp = 'compliance' | 'unterlage' | 'fachdoku' | 'angebot' | 'rechnung'

type Body = {
  typ?: string
  handwerkerId?: string
  titel?: string | null
  auftragId?: string | null
  dokumentId?: string | null
  anfrageId?: string | null
  slotId?: string | null
}

function parseTyp(raw: string): UploadTyp | null {
  const t = raw.trim().toLowerCase()
  if (
    t === 'compliance' ||
    t === 'unterlage' ||
    t === 'fachdoku' ||
    t === 'angebot' ||
    t === 'rechnung'
  ) {
    return t
  }
  return null
}

/**
 * Portal → CRM: Partner-Upload (Compliance / Unterlage / Fachnachweis / Angebot / Rechnung).
 * Push + Timeline; Glocke liest zusätzlich aus DB.
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const typ = parseTyp(String(body.typ ?? ''))
  if (!typ) {
    return NextResponse.json({ ok: false, error: 'typ ungültig' }, { status: 400 })
  }

  const handwerkerId = String(body.handwerkerId ?? '').trim()
  if (!handwerkerId) {
    return NextResponse.json({ ok: false, error: 'handwerkerId fehlt' }, { status: 400 })
  }

  let auftragId = String(body.auftragId ?? '').trim() || null
  const anfrageId = String(body.anfrageId ?? '').trim() || null
  const dokumentId = String(body.dokumentId ?? '').trim() || null
  const slotId = String(body.slotId ?? '').trim() || null
  const titel = String(body.titel ?? '').trim() || null

  const { data: hw } = await supabaseAdmin
    .from('handwerker')
    .select('id, name')
    .eq('id', handwerkerId)
    .maybeSingle()
  if (!hw?.id) {
    return NextResponse.json({ ok: false, error: 'Handwerker unbekannt' }, { status: 404 })
  }
  const hwName = String(hw.name ?? '').trim() || 'Handwerker'

  if (!auftragId && anfrageId) {
    const { data: ah } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id, angebot_id')
      .eq('id', anfrageId)
      .maybeSingle()
    const angId = String(ah?.angebot_id ?? '').trim()
    if (angId) {
      const { data: auf } = await supabaseAdmin
        .from('auftraege')
        .select('id')
        .eq('angebot_id', angId)
        .neq('status', 'storniert')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      auftragId = String(auf?.id ?? '').trim() || null
    }
  }

  if (auftragId) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('id, titel')
      .eq('id', auftragId)
      .maybeSingle()
    if (!auf) {
      return NextResponse.json({ ok: false, error: 'Auftrag unbekannt' }, { status: 404 })
    }

    const timelineTyp =
      typ === 'compliance'
        ? 'partner_compliance'
        : typ === 'fachdoku'
          ? 'partner_fachdoku'
          : typ === 'angebot'
            ? 'partner_angebot'
            : typ === 'rechnung'
              ? 'partner_rechnung'
              : 'partner_unterlage'
    const timelineTitel =
      typ === 'compliance'
        ? 'Compliance-Dokument zur Prüfung'
        : typ === 'fachdoku'
          ? 'Fachnachweis hochgeladen'
          : typ === 'angebot'
            ? 'Partner-Angebot hochgeladen'
            : typ === 'rechnung'
              ? 'Partner-Rechnung eingereicht'
              : 'Partner-Unterlage hochgeladen'

    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: timelineTyp,
      titel: timelineTitel,
      beschreibung: titel?.slice(0, 500) || null,
      handwerker_id: handwerkerId,
      sichtbar_fuer_kunde: false,
    })
  }

  await writeAuditEvent({
    entityType: auftragId ? 'auftrag' : 'handwerker',
    entityId: auftragId || handwerkerId,
    aktion: `partner_${typ}_upload`,
    actorRolle: 'system',
    payload: {
      handwerker_id: handwerkerId,
      dokument_id: dokumentId,
      anfrage_id: anfrageId,
      slot_id: slotId,
      titel,
    },
  })

  const pushTyp: CrmNotificationTyp =
    typ === 'compliance'
      ? 'partner_compliance_pruefung'
      : typ === 'fachdoku'
        ? 'partner_fachdoku'
        : typ === 'rechnung'
          ? 'hw_rechnung_eingegangen'
          : typ === 'angebot'
            ? 'handwerker_einreichung'
            : 'partner_unterlage'

  const pushTitle =
    typ === 'compliance'
      ? `${hwName}: Dokument zur Freigabe`
      : typ === 'fachdoku'
        ? `${hwName}: Fachnachweis hochgeladen`
        : typ === 'angebot'
          ? `${hwName}: Angebot eingereicht`
          : typ === 'rechnung'
            ? `${hwName}: Rechnung eingereicht`
            : `${hwName}: Unterlage hochgeladen`

  const pushBody =
    titel ||
    (typ === 'compliance'
      ? 'Compliance-Upload wartet auf Prüfung.'
      : typ === 'angebot'
        ? 'Partner-Angebot liegt unter Akte → Dokumente.'
        : typ === 'rechnung'
          ? 'Partner-Rechnung liegt unter Akte → Dokumente.'
          : 'Neuer Partner-Upload.')

  const href = auftragId
    ? `/auftraege/${auftragId}?tab=akte`
    : typ === 'compliance'
      ? `/handwerker/${handwerkerId}?tab=compliance`
      : anfrageId
        ? `/angebote`
        : `/handwerker/${handwerkerId}`

  void sendCrmPushToStaff({
    typ: pushTyp,
    title: pushTitle,
    body: pushBody,
    url: href,
    tag: `partner-${typ}-${dokumentId || slotId || anfrageId || handwerkerId}`,
  }).catch((e) => console.warn('[partner-dokument-upload] push', e))

  return NextResponse.json({ ok: true, auftragId })
}
