import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  bestaetigePortalAbnahme,
  createPortalAbnahmeNachSignatur,
  getPortalAbnahmeStatus,
  versendePortalAbnahme,
  type PortalAbnahmeNachSignaturBody,
} from '@/lib/auftraege/portal-abnahmeprotokoll'

async function portalHandwerkerId(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('handwerker')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

/** GET: Status / PDF für Partner nach Signatur */
export async function GET(
  req: Request,
  { params }: { params: { auftragId: string } }
) {
  const supabase = createClient()
  const handwerkerId = await portalHandwerkerId(supabase)
  if (!handwerkerId) {
    return NextResponse.json(
      { error: 'Nicht angemeldet oder kein Partner-Konto.' },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const protokollId = url.searchParams.get('protokoll')?.trim() || null

  const r = await getPortalAbnahmeStatus(params.auftragId, handwerkerId, protokollId)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
  return NextResponse.json(r)
}

/**
 * POST modes:
 * - nach-signatur (default): punkte/maengel/meta → PDF + Notify
 * - bestaetigen: meta.handwerker_bestaetigt_at
 * - versenden: bestätigen + Mail an Kunde
 */
export async function POST(
  req: Request,
  { params }: { params: { auftragId: string } }
) {
  const supabase = createClient()
  const handwerkerId = await portalHandwerkerId(supabase)
  if (!handwerkerId) {
    return NextResponse.json(
      { error: 'Nicht angemeldet oder kein Partner-Konto.' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body.' }, { status: 400 })
  }

  const mode = String(body.mode ?? body.action ?? 'nach-signatur').trim()
  const protokollId =
    String(body.protokoll_id ?? body.protokollId ?? '').trim() || null

  if (mode === 'bestaetigen') {
    const r = await bestaetigePortalAbnahme(params.auftragId, handwerkerId, protokollId)
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (mode === 'versenden') {
    const r = await versendePortalAbnahme(params.auftragId, handwerkerId, protokollId)
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const payload: PortalAbnahmeNachSignaturBody = {
    abnahme_datum: String(body.abnahme_datum ?? body.abnahmeDatum ?? ''),
    punkte: (Array.isArray(body.punkte) ? body.punkte : []) as PortalAbnahmeNachSignaturBody['punkte'],
    maengel: (Array.isArray(body.maengel)
      ? body.maengel
      : []) as PortalAbnahmeNachSignaturBody['maengel'],
    notizen: (body.notizen as string | null | undefined) ?? null,
    meta: (body.meta as PortalAbnahmeNachSignaturBody['meta']) ?? null,
  }

  const r = await createPortalAbnahmeNachSignatur(
    params.auftragId,
    handwerkerId,
    payload
  )
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
  return NextResponse.json({
    ok: true,
    protokoll_id: r.protokoll_id,
    pdf_url: r.pdf_url,
  })
}
