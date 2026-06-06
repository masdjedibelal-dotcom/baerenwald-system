import { supabaseAdmin } from '@/lib/supabase-admin'
import type { DatenschutzAnfrageRow, DatenschutzFaelligRow, DatenschutzFristRow, DatenschutzLoeschlogRow } from '@/lib/datenschutz/types'

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

  return out
}

export async function countDatenschutzFaellige(): Promise<number> {
  const rows = await loadDatenschutzFaellige()
  return rows.length
}
