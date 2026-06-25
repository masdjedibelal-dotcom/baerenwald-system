import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  fotosAusMelderFunnel,
  istMelderKanal,
  leadHatMelderPersonenbezogeneDaten,
  melderLeadAnzeigeTitel,
  MELDER_KANALE,
} from '@/lib/datenschutz/melder-leads'
import type {
  DatenschutzAnfrageRow,
  DatenschutzFaelligRow,
  DatenschutzFristRow,
  DatenschutzLoeschlogRow,
  DatenschutzVvtRow,
  MelderLeadKurz,
} from '@/lib/datenschutz/types'

function monthsAgoDateOnly(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function monthsBetween(isoDate: string, until = new Date()): number {
  const a = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`)
  const b = until
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()))
}

function fotoCount(arr: unknown): number {
  if (!Array.isArray(arr)) return 0
  return (arr as string[]).filter((u) => u && String(u).trim()).length
}

async function loadAufschubMap(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from('datenschutz_aufschub')
    .select('kategorie, referenz_id, gueltig_bis')
    .order('gueltig_bis', { ascending: false })
  const m = new Map<string, string>()
  for (const row of data ?? []) {
    const k = `${(row as { kategorie: string }).kategorie}:${(row as { referenz_id: string }).referenz_id}`
    if (!m.has(k)) m.set(k, String((row as { gueltig_bis: string }).gueltig_bis))
  }
  return m
}

function isStillAufgeschoben(map: Map<string, string>, kategorie: string, referenzId: string): boolean {
  const v = map.get(`${kategorie}:${referenzId}`)
  if (!v) return false
  const d = new Date(v.includes('T') ? v : `${v}T23:59:59`)
  return d.getTime() >= Date.now()
}

export async function loadDatenschutzFristen(): Promise<DatenschutzFristRow[]> {
  const { data, error } = await supabaseAdmin.from('datenschutz_fristen').select('*').order('kategorie')
  if (error || !data) return []
  return data as DatenschutzFristRow[]
}

export async function loadDatenschutzLog(limit = 200): Promise<DatenschutzLoeschlogRow[]> {
  const { data, error } = await supabaseAdmin
    .from('datenschutz_loeschlog')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as DatenschutzLoeschlogRow[]
}

export async function loadDatenschutzAnfragen(): Promise<DatenschutzAnfrageRow[]> {
  const { data, error } = await supabaseAdmin.from('datenschutz_anfragen').select('*').order('created_at', { ascending: false })
  if (error || !data) return []
  return data as DatenschutzAnfrageRow[]
}

export async function loadDatenschutzVvt(): Promise<DatenschutzVvtRow[]> {
  const { data, error } = await supabaseAdmin
    .from('datenschutz_vvt')
    .select('*')
    .eq('aktiv', true)
    .order('sort_order')
  if (error || !data) return []
  return data as DatenschutzVvtRow[]
}

async function loadLeadIdsMitAuftrag(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from('angebote')
    .select('lead_id')
    .not('auftrag_id', 'is', null)
    .not('lead_id', 'is', null)
  const ids = new Set<string>()
  for (const row of data ?? []) {
    const lid = (row as { lead_id: string | null }).lead_id
    if (lid) ids.add(lid)
  }
  const { data: leadsAuftrag } = await supabaseAdmin.from('leads').select('id').eq('status', 'auftrag')
  for (const row of leadsAuftrag ?? []) {
    ids.add(String((row as { id: string }).id))
  }
  return ids
}

export async function searchMelderLeadsByEmail(email: string): Promise<MelderLeadKurz[]> {
  const q = email.trim().toLowerCase()
  if (!q) return []
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, melder_name, melder_email, melder_einheit, kanal, status, created_at, auftraggeber_kunde_id')
    .in('kanal', MELDER_KANALE)
    .ilike('melder_email', q)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data as MelderLeadKurz[]
}

export async function loadMelderLeadForAuskunft(leadId: string) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(
      `
      id, created_at, updated_at, kanal, status, anlass,
      melder_name, melder_einheit, melder_telefon, melder_email,
      notizen, kontakt_nachricht, plz, strasse, hausnummer, ort, funnel_daten,
      auftraggeber:auftraggeber_kunde_id(name, org_anzeigename),
      kunden_objekte:kunde_objekt_id(titel, plz, ort)
    `
    )
    .eq('id', leadId)
    .maybeSingle()
  if (error || !data) return null
  return data
}

export async function loadDatenschutzFaellige(): Promise<DatenschutzFaelligRow[]> {
  const fristen = await loadDatenschutzFristen()
  const fm = (k: string) => fristen.find((f) => f.kategorie === k && f.aktiv)?.frist_monate ?? null
  const aufschub = await loadAufschubMap()
  const out: DatenschutzFaelligRow[] = []

  const mFotos = fm('fotos_auftraege')
  if (mFotos != null) {
    const cutoff = monthsAgoDateOnly(mFotos)
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('id, abnahme_datum, kunden(name), status')
      .eq('status', 'abgeschlossen')
      .not('abnahme_datum', 'is', null)
      .lte('abnahme_datum', cutoff)

    const ids = (auf ?? []).map((r) => String((r as { id: string }).id))
    if (ids.length) {
      const { data: fe } = await supabaseAdmin.from('formular_eintraege').select('auftrag_id, foto_urls').in('auftrag_id', ids)
      const cnt = new Map<string, number>()
      for (const row of fe ?? []) {
        const aid = String((row as { auftrag_id: string | null }).auftrag_id ?? '')
        if (!aid) continue
        const n = fotoCount((row as { foto_urls: unknown }).foto_urls)
        if (n > 0) cnt.set(aid, (cnt.get(aid) ?? 0) + n)
      }

      for (const row of auf ?? []) {
        const id = String((row as { id: string }).id)
        if (isStillAufgeschoben(aufschub, 'fotos_auftraege', id)) continue
        const n = cnt.get(id) ?? 0
        if (n === 0) continue
        const k = (row as { kunden?: { name?: string } | null }).kunden
        const basis = String((row as { abnahme_datum: string }).abnahme_datum)
        out.push({
          kategorie: 'fotos_auftraege',
          referenz_id: id,
          titel: k?.name ? `Auftrag · ${k.name}` : `Auftrag ${id.slice(0, 8)}`,
          basis_datum: basis,
          monate_faellig: monthsBetween(basis),
          beschreibung: `${n} Formular-Foto(s)`,
        })
      }
    }
  }

  const mLeadAb = fm('leads_abgebrochen')
  if (mLeadAb != null) {
    const cutoffEnd = `${monthsAgoDateOnly(mLeadAb)}T23:59:59.999Z`
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('id, kontakt_name, updated_at')
      .eq('status', 'abgebrochen')
      .lte('updated_at', cutoffEnd)

    for (const l of leads ?? []) {
      const id = String((l as { id: string }).id)
      if (isStillAufgeschoben(aufschub, 'leads_abgebrochen', id)) continue
      const u = String((l as { updated_at: string }).updated_at)
      out.push({
        kategorie: 'leads_abgebrochen',
        referenz_id: id,
        titel: String((l as { kontakt_name?: string | null }).kontakt_name ?? 'Lead'),
        basis_datum: u.slice(0, 10),
        monate_faellig: monthsBetween(u.slice(0, 10)),
        beschreibung: 'Lead anonymisieren',
      })
    }
  }

  const mLeadAbs = fm('leads_abgeschlossen')
  if (mLeadAbs != null) {
    const cutoffEnd = `${monthsAgoDateOnly(mLeadAbs)}T23:59:59.999Z`
    const { data: leads2 } = await supabaseAdmin
      .from('leads')
      .select('id, kontakt_name, updated_at')
      .eq('status', 'abgelehnt')
      .lte('updated_at', cutoffEnd)

    for (const l of leads2 ?? []) {
      const id = String((l as { id: string }).id)
      if (isStillAufgeschoben(aufschub, 'leads_abgeschlossen', id)) continue
      const u = String((l as { updated_at: string }).updated_at)
      out.push({
        kategorie: 'leads_abgeschlossen',
        referenz_id: id,
        titel: String((l as { kontakt_name?: string | null }).kontakt_name ?? 'Lead'),
        basis_datum: u.slice(0, 10),
        monate_faellig: monthsBetween(u.slice(0, 10)),
        beschreibung: 'Abgelehnten Lead anonymisieren',
      })
    }
  }

  const mKd = fm('kunden_daten')
  if (mKd != null) {
    const cutoff = monthsAgoDateOnly(mKd)
    const { data: kunden } = await supabaseAdmin.from('kunden').select('id, name, created_at')

    for (const k of kunden ?? []) {
      const kid = String((k as { id: string }).id)
      if (isStillAufgeschoben(aufschub, 'kunden_daten', kid)) continue

      const { count: rCount } = await supabaseAdmin
        .from('rechnungen')
        .select('id', { count: 'exact', head: true })
        .eq('kunde_id', kid)
      if ((rCount ?? 0) > 0) continue

      const { count: aCount } = await supabaseAdmin
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .eq('kunde_id', kid)
      if ((aCount ?? 0) > 0) continue

      const { data: lastLead } = await supabaseAdmin
        .from('leads')
        .select('updated_at')
        .eq('kunde_id', kid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const basisRaw = (lastLead?.updated_at as string | undefined) ?? (k as { created_at: string }).created_at
      const basis = basisRaw.slice(0, 10)
      if (basis > cutoff) continue

      out.push({
        kategorie: 'kunden_daten',
        referenz_id: kid,
        titel: String((k as { name: string }).name),
        basis_datum: basis,
        monate_faellig: monthsBetween(basis),
        beschreibung: 'Kundenstamm anonymisieren',
      })
    }
  }

  const leadIdsMitAuftrag = await loadLeadIdsMitAuftrag()

  const mMelderFotos = fm('melder_fotos')
  if (mMelderFotos != null) {
    const cutoffEnd = `${monthsAgoDateOnly(mMelderFotos)}T23:59:59.999Z`
    const { data: melderLeadsFotos } = await supabaseAdmin
      .from('leads')
      .select('id, kanal, created_at, melder_name, melder_einheit, kontakt_name, funnel_daten')
      .in('kanal', MELDER_KANALE)
      .lte('created_at', cutoffEnd)

    for (const l of melderLeadsFotos ?? []) {
      const id = String((l as { id: string }).id)
      if (isStillAufgeschoben(aufschub, 'melder_fotos', id)) continue
      const n = fotoCount(fotosAusMelderFunnel((l as { funnel_daten: unknown }).funnel_daten))
      if (n === 0) continue
      const basis = String((l as { created_at: string }).created_at).slice(0, 10)
      out.push({
        kategorie: 'melder_fotos',
        referenz_id: id,
        titel: melderLeadAnzeigeTitel(l as { id: string; melder_name?: string | null; melder_einheit?: string | null; kontakt_name?: string | null }),
        basis_datum: basis,
        monate_faellig: monthsBetween(basis),
        beschreibung: `${n} Melder-Foto(s) löschen`,
      })
    }
  }

  const mMelderOffen = fm('melder_leads_offen')
  if (mMelderOffen != null) {
    const cutoffEnd = `${monthsAgoDateOnly(mMelderOffen)}T23:59:59.999Z`
    const { data: melderOffen } = await supabaseAdmin
      .from('leads')
      .select(
        'id, kanal, status, created_at, updated_at, melder_name, melder_email, melder_telefon, melder_einheit, kontakt_name, kontakt_email, funnel_daten'
      )
      .in('kanal', MELDER_KANALE)
      .lte('updated_at', cutoffEnd)

    for (const l of melderOffen ?? []) {
      const status = String((l as { status: string }).status)
      if (status === 'auftrag' || status === 'abgeschlossen') continue
      const id = String((l as { id: string }).id)
      if (leadIdsMitAuftrag.has(id)) continue
      if (isStillAufgeschoben(aufschub, 'melder_leads_offen', id)) continue
      if (!leadHatMelderPersonenbezogeneDaten(l as Parameters<typeof leadHatMelderPersonenbezogeneDaten>[0])) continue
      const u = String((l as { updated_at: string }).updated_at)
      out.push({
        kategorie: 'melder_leads_offen',
        referenz_id: id,
        titel: melderLeadAnzeigeTitel(l as { id: string; melder_name?: string | null; melder_einheit?: string | null; kontakt_name?: string | null }),
        basis_datum: u.slice(0, 10),
        monate_faellig: monthsBetween(u.slice(0, 10)),
        beschreibung: 'Melder-Lead anonymisieren (offen/abgebrochen)',
      })
    }
  }

  const mMelderAb = fm('melder_leads_abgeschlossen')
  if (mMelderAb != null) {
    const cutoffEnd = `${monthsAgoDateOnly(mMelderAb)}T23:59:59.999Z`
    const { data: melderAb } = await supabaseAdmin
      .from('leads')
      .select(
        'id, kanal, status, updated_at, melder_name, melder_email, melder_telefon, melder_einheit, kontakt_name, kontakt_email, funnel_daten'
      )
      .in('kanal', MELDER_KANALE)
      .eq('status', 'abgeschlossen')
      .lte('updated_at', cutoffEnd)

    for (const l of melderAb ?? []) {
      const id = String((l as { id: string }).id)
      if (leadIdsMitAuftrag.has(id)) continue
      if (isStillAufgeschoben(aufschub, 'melder_leads_abgeschlossen', id)) continue
      if (!leadHatMelderPersonenbezogeneDaten(l as Parameters<typeof leadHatMelderPersonenbezogeneDaten>[0])) continue
      const u = String((l as { updated_at: string }).updated_at)
      out.push({
        kategorie: 'melder_leads_abgeschlossen',
        referenz_id: id,
        titel: melderLeadAnzeigeTitel(l as { id: string; melder_name?: string | null; melder_einheit?: string | null; kontakt_name?: string | null }),
        basis_datum: u.slice(0, 10),
        monate_faellig: monthsBetween(u.slice(0, 10)),
        beschreibung: 'Melder-Lead anonymisieren (abgeschlossen ohne Auftrag)',
      })
    }
  }

  return out
}

export async function countDatenschutzFaellige(): Promise<number> {
  const rows = await loadDatenschutzFaellige()
  return rows.length
}
