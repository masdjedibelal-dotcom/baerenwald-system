import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { HandwerkerAnfragePublicPayload } from '@/lib/handwerker-anfrage-types'
import type { AngebotPosition } from '@/lib/types'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim()
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token fehlt' }, { status: 400 })
  }

  const { data: row, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id,
      status,
      antwort_at,
      gesendet_at,
      gewerk_id,
      gewerke(name),
      handwerker(name),
      angebote(
        id,
        positionen,
        kunden(plz, ort),
        leads(zeitraum, bereiche, plz)
      )
    `
    )
    .eq('token', token)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ ok: false, error: 'ungueltig' }, { status: 404 })
  }

  const one = <T,>(x: T | T[] | null | undefined): T | null => {
    if (x == null) return null
    return Array.isArray(x) ? (x[0] as T) ?? null : x
  }

  const raw = row as Record<string, unknown>
  const angebote = one(raw.angebote) as {
    positionen: unknown
    kunden: unknown
    leads: unknown
  } | null

  if (!angebote) {
    return NextResponse.json({ ok: false, error: 'ungueltig' }, { status: 404 })
  }

  const gewerkId = String(raw.gewerk_id)
  const pos = normalizeAngebotPositionen(angebote.positionen).filter((p) => p.gewerk_id === gewerkId)
  const kunde = one(angebote.kunden) as { plz: string | null; ort: string | null } | null
  const leads = one(angebote.leads) as { zeitraum: string | null; plz: string | null } | null
  const plz = kunde?.plz?.trim() || leads?.plz?.trim() || '—'
  const ort = kunde?.ort?.trim() || '—'
  const zeitraum = leads?.zeitraum?.trim() || ''

  const { data: einRows } = await supabaseAdmin.from('einstellungen').select('key, value')
  const map = new Map((einRows ?? []).map((x) => [x.key as string, String(x.value ?? '')]))
  const kontakt_telefon = map.get('telefon')?.trim() || ''
  const kontakt_email = map.get('email')?.trim() || 'info@baerenwaldmuenchen.de'

  let antwort_frist_iso: string | null = null
  const gesendetAt = raw.gesendet_at as string | null
  if (gesendetAt) {
    const d = new Date(gesendetAt)
    d.setDate(d.getDate() + 3)
    antwort_frist_iso = d.toISOString()
  }

  const hw = one(raw.handwerker) as { name: string } | null
  const gw = one(raw.gewerke) as { name: string } | null

  const st = String(raw.status ?? '').toLowerCase()
  let antwort: 'akzeptiert' | 'abgelehnt' | null = null
  if (st === 'akzeptiert') antwort = 'akzeptiert'
  if (st === 'abgelehnt') antwort = 'abgelehnt'

  const payload: HandwerkerAnfragePublicPayload = {
    handwerker_name: hw?.name?.trim() || 'Handwerkerin',
    gewerk_name: gw?.name?.trim() || 'Gewerk',
    plz,
    ort,
    zeitraum,
    geplanter_start: null,
    antwort_frist_iso,
    positionen: pos.map((p: AngebotPosition) => ({
      leistung: (p.leistung || '').trim(),
      beschreibung: (p.beschreibung || p.leistung).trim(),
      menge: p.menge || 1,
      einheit: p.einheit,
    })),
    kontakt_telefon,
    kontakt_email,
    status: String(raw.status ?? 'ausstehend'),
    antwort_at: (raw.antwort_at as string | null) ?? null,
    antwort,
  }

  return NextResponse.json(payload)
}
