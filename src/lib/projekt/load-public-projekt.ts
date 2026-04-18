import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition, AuftragStatus, Kunde, NachtragRow } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

export type PublicTimelineEintrag = {
  id: string
  typ: string
  titel: string
  beschreibung: string | null
  foto_urls: string[] | null
  created_at: string
}

export type PublicProjektPayload = {
  token: string
  auftrag: {
    id: string
    status: AuftragStatus
    titel: string | null
    start_datum: string | null
    end_datum: string | null
  }
  kunde: Pick<Kunde, 'name' | 'email' | 'telefon' | 'adresse' | 'plz' | 'ort'>
  gewerkeLabels: string[]
  angebote: {
    gesamt_min: number | null
    gesamt_max: number | null
    positionen: AngebotPosition[]
  } | null
  timeline: PublicTimelineEintrag[]
  nachtraegeAkzeptiert: Pick<NachtragRow, 'id' | 'grund' | 'gesamt_min' | 'gesamt_max'>[]
}

export async function loadPublicProjektByToken(token: string): Promise<PublicProjektPayload | null> {
  const t = token?.trim()
  if (!t || t.length < 16) return null

  const { data: auf, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id, status, titel, start_datum, end_datum, kunden_token,
      kunden(name, email, telefon, adresse, plz, ort),
      angebote(gesamt_min, gesamt_max, positionen),
      auftrag_handwerker(gewerke(name))
    `
    )
    .eq('kunden_token', t)
    .maybeSingle()

  if (aErr || !auf) return null

  const auftragId = auf.id as string

  const { data: tlRows } = await supabaseAdmin
    .from('auftrag_timeline')
    .select('id, typ, titel, beschreibung, foto_urls, created_at')
    .eq('auftrag_id', auftragId)
    .eq('fuer_kunde_freigegeben', true)
    .order('created_at', { ascending: false })

  const { data: nachtRows } = await supabaseAdmin
    .from('nachtraege')
    .select('id, grund, gesamt_min, gesamt_max')
    .eq('auftrag_id', auftragId)
    .eq('status', 'akzeptiert')

  const row = auf as Record<string, unknown>
  const k = row.kunden as PublicProjektPayload['kunde'] | null
  if (!k?.name) return null

  const ang = row.angebote as { gesamt_min?: unknown; gesamt_max?: unknown; positionen?: unknown } | null
  const zhw = (row.auftrag_handwerker ?? []) as { gewerke?: { name?: string } | null }[]
  const gewerkeLabels = Array.from(
    new Set(zhw.map((z) => z.gewerke?.name).filter((n): n is string => Boolean(n && n.trim())))
  )

  const timeline: PublicTimelineEintrag[] = (tlRows ?? []).map((e) => ({
    id: String(e.id),
    typ: String(e.typ),
    titel: String(e.titel),
    beschreibung: e.beschreibung ? String(e.beschreibung) : null,
    foto_urls: Array.isArray(e.foto_urls) ? (e.foto_urls as string[]) : [],
    created_at: String(e.created_at),
  }))

  const nachtraegeAkzeptiert = (nachtRows ?? []) as PublicProjektPayload['nachtraegeAkzeptiert']

  const angebote = ang
    ? {
        gesamt_min: ang.gesamt_min != null ? Number(ang.gesamt_min) : null,
        gesamt_max: ang.gesamt_max != null ? Number(ang.gesamt_max) : null,
        positionen: normalizeAngebotPositionen(ang.positionen ?? []),
      }
    : null

  return {
    token: t,
    auftrag: {
      id: auftragId,
      status: row.status as AuftragStatus,
      titel: row.titel ? String(row.titel) : null,
      start_datum: row.start_datum ? String(row.start_datum) : null,
      end_datum: row.end_datum ? String(row.end_datum) : null,
    },
    kunde: {
      name: k.name,
      email: k.email ?? null,
      telefon: k.telefon ?? null,
      adresse: k.adresse ?? null,
      plz: k.plz ?? null,
      ort: k.ort ?? null,
    },
    gewerkeLabels,
    angebote,
    timeline,
    nachtraegeAkzeptiert,
  }
}
