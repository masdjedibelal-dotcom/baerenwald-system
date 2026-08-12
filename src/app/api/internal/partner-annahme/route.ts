import { NextResponse } from 'next/server'
import { acceptHandwerkerZuweisung } from '@/lib/angebote/handwerker-annahme'
import { isHandwerkerAblehnungGrund } from '@/lib/angebote/ablehnung-labels'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { sendCrmPushToStaff } from '@/lib/push/send'
import { supabaseAdmin } from '@/lib/supabase-admin'

function authorize(req: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

type Body = {
  antwort: 'akzeptiert' | 'abgelehnt'
  handwerkerId: string
  /** angebot_handwerker.id — Standardpfad */
  zuweisungId?: string
  /** Fallback: Direktauftrag ohne angebot_handwerker */
  auftragId?: string
  notiz?: string
  grund?: string
}

/**
 * Portal → CRM: kanonische HW-Annahme (Q2, analog org-portal-notify).
 * POST /api/internal/partner-annahme
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body' }, { status: 400 })
  }

  const handwerkerId = String(body.handwerkerId ?? '').trim()
  const zuweisungId = String(body.zuweisungId ?? '').trim()
  const auftragId = String(body.auftragId ?? '').trim()
  if (!handwerkerId || (!zuweisungId && !auftragId)) {
    return NextResponse.json(
      { ok: false, error: 'handwerkerId und zuweisungId oder auftragId erforderlich' },
      { status: 400 }
    )
  }

  if (body.antwort !== 'akzeptiert' && body.antwort !== 'abgelehnt') {
    return NextResponse.json({ ok: false, error: 'Ungültige Antwort' }, { status: 400 })
  }
  if (body.antwort === 'abgelehnt') {
    if (!body.grund || !isHandwerkerAblehnungGrund(body.grund)) {
      return NextResponse.json(
        { ok: false, error: 'Ablehnungsgrund fehlt oder ungültig' },
        { status: 400 }
      )
    }
  }

  // Standard: angebot_handwerker-Zuweisung
  if (zuweisungId) {
    const { data: asZuweisung } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id')
      .eq('id', zuweisungId)
      .maybeSingle()

    if (asZuweisung?.id) {
      const r = await acceptHandwerkerZuweisung({
        zuweisungId,
        antwort: body.antwort,
        notiz: body.notiz,
        ablehnungGrund: body.antwort === 'abgelehnt' ? body.grund : null,
        quelle: 'portal',
        handwerkerId,
      })

      if (!r.ok) {
        return NextResponse.json(
          { ok: false, error: r.message },
          { status: r.httpStatus ?? 400 }
        )
      }

      return NextResponse.json({ ok: true, status: r.status, already: r.already === true })
    }

    // Legacy-Bug: Portal sandte manchmal auftragId als zuweisungId
    if (!auftragId) {
      const { data: asAuftrag } = await supabaseAdmin
        .from('auftraege')
        .select('id')
        .eq('id', zuweisungId)
        .maybeSingle()
      if (asAuftrag?.id) {
        const notified = await notifyDirektauftragAntwort({
          auftragId: zuweisungId,
          handwerkerId,
          antwort: body.antwort,
          notiz: body.notiz,
          grund: body.grund,
        })
        if (!notified.ok) {
          return NextResponse.json({ ok: false, error: notified.error }, { status: 500 })
        }
        return NextResponse.json({ ok: true, status: body.antwort, direktauftrag: true })
      }
    }
  }

  if (auftragId) {
    const notified = await notifyDirektauftragAntwort({
      auftragId,
      handwerkerId,
      antwort: body.antwort,
      notiz: body.notiz,
      grund: body.grund,
    })
    if (!notified.ok) {
      return NextResponse.json({ ok: false, error: notified.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: body.antwort, direktauftrag: true })
  }

  return NextResponse.json({ ok: false, error: 'Zuweisung nicht gefunden' }, { status: 404 })
}

async function notifyDirektauftragAntwort(input: {
  auftragId: string
  handwerkerId: string
  antwort: 'akzeptiert' | 'abgelehnt'
  notiz?: string | null
  grund?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, lead_id, angebot_id, titel')
    .eq('id', input.auftragId)
    .maybeSingle()

  if (error || !auftrag) {
    return { ok: false, error: error?.message ?? 'Auftrag nicht gefunden' }
  }

  const { data: hw } = await supabaseAdmin
    .from('handwerker')
    .select('name')
    .eq('id', input.handwerkerId)
    .maybeSingle()

  const handwerkerName = (hw as { name?: string } | null)?.name?.trim() || 'Handwerker'
  const titel =
    input.antwort === 'akzeptiert' ? 'Handwerker hat zugesagt' : 'Handwerker hat abgelehnt'
  const auftragTitel = String((auftrag as { titel?: string | null }).titel ?? '').trim()
  const leadId = (auftrag as { lead_id?: string | null }).lead_id?.trim() || null
  const angebotId = (auftrag as { angebot_id?: string | null }).angebot_id?.trim() || null
  const body = [handwerkerName, auftragTitel, input.notiz?.trim(), input.grund?.trim()]
    .filter(Boolean)
    .join(' · ')

  if (leadId) {
    await insertLeadTimelineEvent(supabaseAdmin, {
      lead_id: leadId,
      angebot_id: angebotId,
      typ: 'handwerker',
      titel,
      beschreibung: `${body} (Portal · Direktauftrag)`,
    })
  }

  try {
    await sendCrmPushToStaff({
      typ: input.antwort === 'akzeptiert' ? 'handwerker_angenommen' : 'handwerker_abgelehnt',
      title: `${handwerkerName} hat ${input.antwort === 'akzeptiert' ? 'zugesagt' : 'abgelehnt'}`,
      body: auftragTitel || body,
      url: `/auftraege/${input.auftragId}`,
      tag: `hw-auftrag-antwort-${input.auftragId}-${input.handwerkerId}`,
    })
  } catch (e) {
    console.warn('[partner-annahme] direktauftrag push', e)
  }

  return { ok: true }
}
