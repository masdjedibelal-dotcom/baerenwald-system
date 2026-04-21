import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAnfrageBestaetigung } from '@/app/actions/mails'
import { tomorrowYmd } from '@/lib/kalender-auto-termine'

export const dynamic = 'force-dynamic'

type Body = {
  name?: string
  email?: string
  telefon?: string
  plz?: string
  situation?: string
  bereiche?: string[]
  preis_min?: number | null
  preis_max?: number | null
  zeitraum?: string
  notizen?: string
  kanal?: string
}

export async function POST(req: Request) {
  const secret = process.env.LEAD_API_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiges JSON' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const telefon = String(body.telefon ?? '').trim()
  const plz = String(body.plz ?? '').trim()
  const kanalRaw = body.kanal ?? 'website'
  const kanal = (
    ['website', 'telefon', 'whatsapp', 'email', 'vor_ort', 'sonstiges'].includes(String(kanalRaw))
      ? kanalRaw
      : 'website'
  ) as 'website' | 'telefon' | 'whatsapp' | 'email' | 'vor_ort' | 'sonstiges'

  if (!name) {
    return NextResponse.json({ ok: false, error: 'Name ist erforderlich' }, { status: 400 })
  }
  if (!email && !telefon) {
    return NextResponse.json({ ok: false, error: 'E-Mail oder Telefon nötig' }, { status: 400 })
  }

  let kundeId: string | null = null
  if (email) {
    const { data: existing } = await supabaseAdmin.from('kunden').select('id').eq('email', email).maybeSingle()
    if (existing?.id) kundeId = existing.id as string
  }

  if (!kundeId) {
    const kundentyp = body.situation === 'gewerbe' ? 'gewerbe' : 'privat'
    const { data: kundeRow, error: kundeErr } = await supabaseAdmin
      .from('kunden')
      .insert({
        name,
        email: email || null,
        telefon: telefon || null,
        plz: plz || null,
        typ: kundentyp,
        adresse: null,
        ort: null,
        notizen: null,
      })
      .select('id')
      .single()
    if (kundeErr || !kundeRow) {
      return NextResponse.json({ ok: false, error: kundeErr?.message ?? 'Kunde' }, { status: 500 })
    }
    kundeId = kundeRow.id as string
  }

  const bereiche = Array.isArray(body.bereiche) ? body.bereiche.filter((x) => typeof x === 'string') : []

  const { data: leadRow, error: leadErr } = await supabaseAdmin
    .from('leads')
    .insert({
      kunde_id: kundeId,
      kanal,
      status: 'neu',
      situation: body.situation?.trim() || null,
      bereiche: bereiche.length ? bereiche : null,
      preis_min: body.preis_min ?? null,
      preis_max: body.preis_max ?? null,
      plz: plz || null,
      zeitraum: body.zeitraum?.trim() || null,
      kundentyp: body.situation === 'gewerbe' ? 'gewerbe' : 'privat',
      kontakt_name: name,
      kontakt_email: email || null,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: null,
      notizen: body.notizen?.trim() || null,
      funnel_daten: {},
    })
    .select('id')
    .single()

  if (leadErr || !leadRow) {
    return NextResponse.json({ ok: false, error: leadErr?.message ?? 'Lead' }, { status: 500 })
  }

  const leadId = leadRow.id as string

  await supabaseAdmin.from('leads_status_history').insert({
    lead_id: leadId,
    status_alt: null,
    status_neu: 'neu',
    user_id: null,
  })

  await supabaseAdmin.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'created',
    titel: 'Anfrage erstellt',
    beschreibung: null,
    erstellt_von: null,
  })

  await supabaseAdmin.from('kalender_termine').insert({
    titel: `Kontakt: ${name}`,
    datum: tomorrowYmd(),
    typ: 'sonstiges',
    lead_id: leadId,
    auftrag_id: null,
    uhrzeit_von: null,
    uhrzeit_bis: null,
    adresse: null,
    beschreibung: null,
    erledigt: false,
  })

  if (kanal === 'website') {
    await sendAnfrageBestaetigung(leadId)
  }

  return NextResponse.json({ ok: true, id: leadId })
}
