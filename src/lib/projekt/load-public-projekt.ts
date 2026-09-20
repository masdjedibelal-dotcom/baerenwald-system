import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition, AuftragStatus, Kunde, LeadStatus, NachtragRow } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

export type PublicMilestone = {
  id: string
  titel: string
  beschreibung: string | null
  datum: string | null
  erledigt: boolean
  sort_order: number
}

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
    fortschritt: number | null
    naechster_schritt: string | null
    abnahme_protokoll_url: string | null
    abnahme_datum: string | null
  }
  leadStatus: LeadStatus | null
  kunde: Pick<Kunde, 'name' | 'email' | 'telefon' | 'adresse' | 'plz' | 'ort'>
  gewerkeLabels: string[]
  angebote: {
    gesamt_min: number | null
    gesamt_max: number | null
    positionen: AngebotPosition[]
  } | null
  timeline: PublicTimelineEintrag[]
  milestones: PublicMilestone[]
  nachtraegeAkzeptiert: Pick<NachtragRow, 'id' | 'grund' | 'gesamt_min' | 'gesamt_max'>[]
  /** Gestellte Kundenrechnung → Live-Status Punkt 5 Fertig erledigt */
  hasRechnung: boolean
}

export async function loadPublicProjektByToken(token: string): Promise<PublicProjektPayload | null> {
  const t = token?.trim()
  if (!t || t.length < 16) return null

  const { data: auf, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id, status, titel, start_datum, end_datum, kunden_token, fortschritt, naechster_schritt, lead_id,
      abnahme_protokoll_url, abnahme_datum,
      kunden(name, email, telefon, adresse, plz, ort),
      leads(status),
      angebote(gesamt_min, gesamt_max, positionen),
      auftrag_handwerker(gewerke(name))
    `
    )
    .eq('kunden_token', t)
    .maybeSingle()
  if (aErr) logDbError('lib/projekt/load-public-projekt:auftraege', aErr)

  if (aErr || !auf) return null

  const auftragId = auf.id as string

  const { data: cur, error: error2 } = await supabaseAdmin
    .from('auftraege')
    .select('kunden_seite_aufrufe')
    .eq('id', auftragId)
    .maybeSingle()
  if (error2) logDbError('lib/projekt/load-public-projekt:auftraege', error2)
  const prevCount = (cur as { kunden_seite_aufrufe?: number | null } | null)?.kunden_seite_aufrufe ?? 0

  const { error: __dbErr1 } = await supabaseAdmin
    .from('auftraege')
    .update({
      kunden_seite_aufrufe: (typeof prevCount === 'number' ? prevCount : 0) + 1,
      kunden_seite_letzter_aufruf: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)
  if (__dbErr1) logDbError('lib/projekt/load-public-projekt:auftraege', __dbErr1)

  const { data: tlRows, error: error3 } = await supabaseAdmin
    .from('auftrag_timeline')
    .select('id, typ, titel, beschreibung, foto_urls, created_at')
    .eq('auftrag_id', auftragId)
    .eq('fuer_kunde_freigegeben', true)
    .order('created_at', { ascending: true })
  if (error3) logDbError('lib/projekt/load-public-projekt:auftrag_timeline', error3)

  const { data: msRows, error: error4 } = await supabaseAdmin
    .from('auftrag_milestones')
    .select('id, titel, beschreibung, datum, erledigt, sort_order')
    .eq('auftrag_id', auftragId)
    .eq('fuer_kunden_sichtbar', true)
    .order('sort_order', { ascending: true })
  if (error4) logDbError('lib/projekt/load-public-projekt:auftrag_milestones', error4)

  const { data: nachtRows, error: error5 } = await supabaseAdmin
    .from('nachtraege')
    .select('id, grund, gesamt_min, gesamt_max')
    .eq('auftrag_id', auftragId)
    .eq('status', 'akzeptiert')
  if (error5) logDbError('lib/projekt/load-public-projekt:nachtraege', error5)

  const { data: rechnungRows, error: error6 } = await supabaseAdmin
    .from('rechnungen')
    .select('id, status, beleg_typ, richtung')
    .eq('auftrag_id', auftragId)
    .in('status', ['gesendet', 'bezahlt'])
    .limit(8)
  if (error6) logDbError('lib/projekt/load-public-projekt:rechnungen', error6)

  const hasRechnung = (rechnungRows ?? []).some((r) => {
    const beleg = String((r as { beleg_typ?: string | null }).beleg_typ ?? 'rechnung')
      .trim()
      .toLowerCase()
    if (beleg === 'gutschrift') return false
    const richtung = String((r as { richtung?: string | null }).richtung ?? 'ausgehend')
      .trim()
      .toLowerCase()
    return richtung !== 'eingehend'
  })

  const row = auf as Record<string, unknown>
  const k = row.kunden as PublicProjektPayload['kunde'] | null
  if (!k?.name) return null

  const leadRaw = row.leads as { status?: LeadStatus } | { status?: LeadStatus }[] | null
  const leadOne = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw
  const leadStatus = (leadOne?.status as LeadStatus) ?? null

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

  const milestones: PublicMilestone[] = (msRows ?? []).map((m) => ({
    id: String(m.id),
    titel: String(m.titel),
    beschreibung: m.beschreibung ? String(m.beschreibung) : null,
    datum: m.datum ? String(m.datum) : null,
    erledigt: Boolean(m.erledigt),
    sort_order: Number(m.sort_order ?? 0),
  }))

  const nachtraegeAkzeptiert = (nachtRows ?? []) as PublicProjektPayload['nachtraegeAkzeptiert']

  const angebote = ang
    ? {
        gesamt_min: ang.gesamt_min != null ? Number(ang.gesamt_min) : null,
        gesamt_max: ang.gesamt_max != null ? Number(ang.gesamt_max) : null,
        positionen: normalizeAngebotPositionen(ang.positionen ?? []),
      }
    : null

  const fr = row.fortschritt
  const fortschritt = typeof fr === 'number' ? fr : fr != null ? Number(fr) : null

  return {
    token: t,
    auftrag: {
      id: auftragId,
      status: row.status as AuftragStatus,
      titel: row.titel ? String(row.titel) : null,
      start_datum: row.start_datum ? String(row.start_datum) : null,
      end_datum: row.end_datum ? String(row.end_datum) : null,
      fortschritt,
      naechster_schritt: row.naechster_schritt ? String(row.naechster_schritt) : null,
      abnahme_protokoll_url: row.abnahme_protokoll_url
        ? String(row.abnahme_protokoll_url).trim() || null
        : null,
      abnahme_datum: row.abnahme_datum ? String(row.abnahme_datum) : null,
    },
    leadStatus,
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
    milestones,
    nachtraegeAkzeptiert,
    hasRechnung,
  }
}
