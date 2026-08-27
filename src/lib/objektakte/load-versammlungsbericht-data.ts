import { loadObjektHistorie } from '@/lib/objektakte/load-objekt-historie'
import { loadKundenObjektForAkte } from '@/lib/objektakte/load-objekt-akte'
import { summeObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import type { ObjektHistorieRow } from '@/lib/objektakte/types'
import { createClient } from '@/lib/supabase-server'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'

export type VersammlungsberichtAnlageHighlight = {
  bezeichnung: string
  vorgangCount: number
  kostenSumme: number
}

export type VersammlungsberichtAnlageHighlightDetail = VersammlungsberichtAnlageHighlight & {
  id: string
  gewerk: string | null
  standort: string | null
  neuwertEuro: number | null
  garantieLabel: string | null
  zeilen: Array<{ datum: string; titel: string; kostenEuro: number | null }>
}

export type VersammlungsberichtAnlageBestandRow = {
  id: string
  bezeichnung: string
  gewerkName: string | null
  standortEinheit: string | null
  einbau_datum: string | null
  garantie_bis: string | null
  gewaehrleistung_bis: string | null
  massnahmenImZeitraum: number
}

export type VersammlungsberichtPayload = {
  orgName: string
  orgLogoDataUrl: string | null
  orgPrimaryColor: string | null
  orgKontakt: string | null
  objektTitel: string
  objektAdresse: string
  zeitraumVon: string
  zeitraumBis: string
  erstelltAm: string
  einzelpreise: boolean
  vorgaengeImZeitraum: ObjektHistorieRow[]
  vorgaengeOffen: ObjektHistorieRow[]
  anlagenHighlights: VersammlungsberichtAnlageHighlight[]
  anlagenHighlightsDetail: VersammlungsberichtAnlageHighlightDetail[]
  anlagenBestand: VersammlungsberichtAnlageBestandRow[]
  gesamtKosten: number
  ohneKostenAngabe: number
  nachGewerk: Array<{ gewerk: string; count: number; summe: number }>
  nachKategorie: { reparatur: number; instandhaltung: number; wartung: number }
  nachKategorieSummen: { reparatur: number; instandhaltung: number; wartung: number }
  leererZeitraum: boolean
  keineAnlagen: boolean
}

function datumInRange(d: string, von: string, bis: string): boolean {
  const day = d.slice(0, 10)
  if (von && day < von) return false
  if (bis && day > bis) return false
  return true
}

function istOffen(row: ObjektHistorieRow): boolean {
  const u = row.unterstatus.toLowerCase()
  return !(
    u === 'bezahlt' ||
    u === 'abgeschlossen' ||
    u === 'storniert' ||
    u === 'abgebrochen' ||
    u === 'abgelehnt' ||
    u === 'angenommen' ||
    u === 'erledigt'
  )
}

function kategorieBucket(row: ObjektHistorieRow): 'reparatur' | 'instandhaltung' | 'wartung' {
  if (row.ist_wiederkehrend || row.phase === 'bestand') return 'wartung'
  const u = row.unterstatus.toLowerCase()
  if (u.includes('wart') || row.phase === 'rechnung') return 'instandhaltung'
  return 'reparatur'
}

function fmtMonatJahr(iso: string | null | undefined): string | null {
  const d = iso?.trim()?.slice(0, 10)
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })
}

function garantieStatusLabel(iso: string | null | undefined): string | null {
  const raw = iso?.trim()?.slice(0, 10)
  if (!raw) return null
  const label = fmtMonatJahr(raw)
  if (!label) return null
  const end = new Date(raw)
  if (Number.isNaN(end.getTime())) return `bis ${label}`
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  if (end < heute) return `abgelaufen (bis ${label})`
  return `bis ${label}`
}

async function resolveLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  const u = url?.trim()
  if (!u) return null
  if (u.startsWith('data:')) return u
  if (!/^https?:\/\//i.test(u)) return null
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || 'image/png'
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 2_000_000) return null
    return `data:${ct};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function orgKontaktZeile(kunde: {
  org_telefon?: string | null
  email?: string | null
  mieter_kontakt_email?: string | null
} | null): string | null {
  if (!kunde) return null
  const tel = kunde.org_telefon?.trim()
  const mail = (kunde.mieter_kontakt_email || kunde.email)?.trim()
  const parts = [tel, mail].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

type AnlageDbRow = {
  id: unknown
  bezeichnung: unknown
  standort: unknown
  status: unknown
  einbau_datum: unknown
  garantie_bis?: unknown
  gewaehrleistung_bis?: unknown
  anschaffungswert_eur?: unknown
  gewerke: unknown
  objekt_einheiten: unknown
}

type AnlagenBerichtQuery = {
  data: AnlageDbRow[] | null
  error: { message: string } | null
}

async function fetchAnlagenBerichtRows(
  supabase: ReturnType<typeof createClient>,
  oid: string,
  select: string
): Promise<AnlagenBerichtQuery> {
  const { data, error } = await supabase
    .from('objekt_anlagen')
    .select(select)
    .eq('kunde_objekt_id', oid)
    .neq('status', 'stillgelegt')
    .order('bezeichnung', { ascending: true })
  return {
    data: (data ?? null) as AnlageDbRow[] | null,
    error: error ? { message: error.message } : null,
  }
}

async function loadAnlagenRowsForBericht(oid: string): Promise<AnlageDbRow[]> {
  const supabase = createClient()
  const fullSelect =
    'id, bezeichnung, standort, status, einbau_datum, garantie_bis, gewaehrleistung_bis, anschaffungswert_eur, gewerke(name), objekt_einheiten(bezeichnung, etage)'
  const fullSelectNoEtage =
    'id, bezeichnung, standort, status, einbau_datum, garantie_bis, gewaehrleistung_bis, anschaffungswert_eur, gewerke(name), objekt_einheiten(bezeichnung)'
  const basicSelect =
    'id, bezeichnung, standort, status, einbau_datum, gewerke(name), objekt_einheiten(bezeichnung, etage)'
  const basicSelectNoEtage =
    'id, bezeichnung, standort, status, einbau_datum, gewerke(name), objekt_einheiten(bezeichnung)'

  let res = await fetchAnlagenBerichtRows(supabase, oid, fullSelect)

  if (res.error && /etage/i.test(res.error.message)) {
    res = await fetchAnlagenBerichtRows(supabase, oid, fullSelectNoEtage)
  }

  if (
    res.error &&
    /garantie|gewaehrleistung|anschaffungswert|dokument/i.test(res.error.message)
  ) {
    res = await fetchAnlagenBerichtRows(supabase, oid, basicSelect)
    if (res.error && /etage/i.test(res.error.message)) {
      res = await fetchAnlagenBerichtRows(supabase, oid, basicSelectNoEtage)
    }
  }

  return res.data ?? []
}

export async function loadVersammlungsberichtPayload(input: {
  kundeId: string
  objektId: string
  von: string
  bis: string
  einzelpreise: boolean
}): Promise<VersammlungsberichtPayload | null> {
  const kid = input.kundeId.trim()
  const oid = input.objektId.trim()
  const von = input.von.trim()
  const bis = input.bis.trim()
  if (!kid || !oid) return null

  const supabaseAnlagen = createClient()
  const [objekt, historie, kundeRes, anlagenRows] = await Promise.all([
    loadKundenObjektForAkte(kid, oid),
    loadObjektHistorie(kid, oid),
    createClient()
      .from('kunden')
      .select(
        'name, org_anzeigename, org_logo_url, org_primary_color, org_telefon, email, mieter_kontakt_email'
      )
      .eq('id', kid)
      .maybeSingle(),
    loadAnlagenRowsForBericht(oid),
  ])

  if (!objekt) return null
  const kunde = kundeRes.data

  const vorgaengeImZeitraum = historie.rows.filter((r) => datumInRange(r.datum, von, bis))
  const vorgaengeOffen = vorgaengeImZeitraum.filter(istOffen)
  const { summe, ohneAngabe } = summeObjektVorgangKosten(vorgaengeImZeitraum)

  const gewerkMap = new Map<string, { count: number; summe: number }>()
  const kategorie = { reparatur: 0, instandhaltung: 0, wartung: 0 }
  const kategorieSummen = { reparatur: 0, instandhaltung: 0, wartung: 0 }

  for (const r of vorgaengeImZeitraum) {
    const g = r.gewerkLabel?.trim() || '—'
    if (g !== '—') {
      const cur = gewerkMap.get(g) ?? { count: 0, summe: 0 }
      cur.count++
      if (r.kostenEuro != null) cur.summe += r.kostenEuro
      gewerkMap.set(g, cur)
    }
    const bucket = kategorieBucket(r)
    kategorie[bucket]++
    if (r.kostenEuro != null) kategorieSummen[bucket] += r.kostenEuro
  }

  const anlageStats = new Map<
    string,
    {
      id: string
      bezeichnung: string
      vorgangCount: number
      kostenSumme: number
      zeilen: Array<{ datum: string; titel: string; kostenEuro: number | null }>
    }
  >()

  for (const r of vorgaengeImZeitraum) {
    const id = r.anlageId?.trim()
    const label = r.anlageLabel?.trim()
    if (!id && !label) continue
    const key = id || label!
    const cur = anlageStats.get(key) ?? {
      id: id || key,
      bezeichnung: label || '—',
      vorgangCount: 0,
      kostenSumme: 0,
      zeilen: [],
    }
    cur.vorgangCount++
    if (r.kostenEuro != null) cur.kostenSumme += r.kostenEuro
    cur.zeilen.push({
      datum: r.datum,
      titel: r.titel,
      kostenEuro: r.kostenEuro,
    })
    anlageStats.set(key, cur)
  }

  const anlageById = new Map(
    anlagenRows.map((a) => {
      const gewerkRaw = a.gewerke as { name?: string } | { name?: string }[] | null
      const gewerk = Array.isArray(gewerkRaw) ? gewerkRaw[0] : gewerkRaw
      const einheitRaw = a.objekt_einheiten as
        | { bezeichnung?: string; etage?: string | null }
        | { bezeichnung?: string; etage?: string | null }[]
        | null
      const einheit = Array.isArray(einheitRaw) ? einheitRaw[0] : einheitRaw
      const standort = (a.standort as string | null)?.trim() || null
      const einheitLabel = einheit?.bezeichnung?.trim()
        ? einheit.etage?.trim()
          ? `${einheit.bezeichnung} · ${einheit.etage}`
          : einheit.bezeichnung
        : null
      return [
        String(a.id),
        {
          id: String(a.id),
          bezeichnung: String(a.bezeichnung ?? '').trim() || '—',
          gewerkName: gewerk?.name?.trim() || null,
          standort,
          standortEinheit: [standort, einheitLabel].filter(Boolean).join(' · ') || null,
          einbau_datum: (a.einbau_datum as string | null) ?? null,
          garantie_bis: (a.garantie_bis as string | null) ?? null,
          gewaehrleistung_bis: (a.gewaehrleistung_bis as string | null) ?? null,
          anschaffungswert_eur:
            a.anschaffungswert_eur != null ? Number(a.anschaffungswert_eur) : null,
        },
      ] as const
    })
  )

  const countByAnlageId: Record<string, number> = {}
  for (const r of vorgaengeImZeitraum) {
    const id = r.anlageId?.trim()
    if (id) countByAnlageId[id] = (countByAnlageId[id] ?? 0) + 1
  }

  const anlagenHighlightsDetail: VersammlungsberichtAnlageHighlightDetail[] = Array.from(
    anlageStats.values()
  )
    .filter((a) => a.vorgangCount >= 2)
    .sort((a, b) => b.kostenSumme - a.kostenSumme)
    .map((a) => {
      const meta = anlageById.get(a.id)
      const garantieRaw = meta?.gewaehrleistung_bis || meta?.garantie_bis
      return {
        id: a.id,
        bezeichnung: a.bezeichnung,
        vorgangCount: a.vorgangCount,
        kostenSumme: a.kostenSumme,
        gewerk: meta?.gewerkName ?? null,
        standort: meta?.standort ?? null,
        neuwertEuro: meta?.anschaffungswert_eur ?? null,
        garantieLabel: garantieStatusLabel(garantieRaw),
        zeilen: [...a.zeilen].sort((x, y) => x.datum.localeCompare(y.datum)),
      }
    })

  const anlagenHighlights = anlagenHighlightsDetail.map(({ bezeichnung, vorgangCount, kostenSumme }) => ({
    bezeichnung,
    vorgangCount,
    kostenSumme,
  }))

  const anlagenBestand: VersammlungsberichtAnlageBestandRow[] = anlagenRows.map((a) => {
    const meta = anlageById.get(String(a.id))!
    return {
      id: meta.id,
      bezeichnung: meta.bezeichnung,
      gewerkName: meta.gewerkName,
      standortEinheit: meta.standortEinheit,
      einbau_datum: meta.einbau_datum,
      garantie_bis: meta.garantie_bis,
      gewaehrleistung_bis: meta.gewaehrleistung_bis,
      massnahmenImZeitraum: countByAnlageId[meta.id] ?? 0,
    }
  })

  const str = kundenObjektStrasseZeile(objekt)
  const ort = [objekt.plz, objekt.ort].filter(Boolean).join(' ').trim()
  const adresse = [str, ort].filter(Boolean).join(', ')

  const logoRaw = (kunde?.org_logo_url as string | null)?.trim() || null
  const orgLogoDataUrl = await resolveLogoDataUrl(logoRaw)

  return {
    orgName: (kunde?.org_anzeigename || kunde?.name || 'Hausverwaltung').trim(),
    orgLogoDataUrl,
    orgPrimaryColor: (kunde?.org_primary_color as string | null)?.trim() || null,
    orgKontakt: orgKontaktZeile(kunde),
    objektTitel: objekt.titel?.trim() || 'Objekt',
    objektAdresse: adresse,
    zeitraumVon: von,
    zeitraumBis: bis,
    erstelltAm: new Date().toISOString().slice(0, 10),
    einzelpreise: input.einzelpreise,
    vorgaengeImZeitraum,
    vorgaengeOffen,
    anlagenHighlights,
    anlagenHighlightsDetail,
    anlagenBestand,
    gesamtKosten: summe,
    ohneKostenAngabe: ohneAngabe,
    nachGewerk: Array.from(gewerkMap.entries())
      .map(([gewerk, v]) => ({ gewerk, count: v.count, summe: v.summe }))
      .sort((a, b) => b.summe - a.summe),
    nachKategorie: kategorie,
    nachKategorieSummen: kategorieSummen,
    leererZeitraum: vorgaengeImZeitraum.length === 0,
    keineAnlagen: anlagenRows.length === 0,
  }
}
