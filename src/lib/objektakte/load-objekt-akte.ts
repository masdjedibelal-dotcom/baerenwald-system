import { createClient } from '@/lib/supabase-server'
import { listOrgHausmeister, loadHausmeisterForObjekt } from '@/lib/org/org-hausmeister'
import type {
  AktenNotiz,
  EinheitBewohner,
  FremdVorgang,
  ObjektAkteDetailPayload,
  ObjektAkteReadOnlyPayload,
  ObjektAnlage,
  ObjektDokument,
  ObjektEinheit,
  ObjektKontakt,
} from '@/lib/objektakte/types'
import type { KundenObjekt } from '@/lib/types'

export async function loadKundenObjektForAkte(
  kundeId: string,
  objektId: string
): Promise<KundenObjekt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .select('*')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()

  if (error || !data) return null
  return data as KundenObjekt
}

async function loadObjektAnlagen(
  supabase: ReturnType<typeof createClient>,
  kundeId: string,
  objektId: string
): Promise<ObjektAnlage[]> {
  const fullSelect =
    '*, gewerke(id, name, slug), objekt_einheiten(bezeichnung, etage)'
  const fullSelectNoEtage =
    '*, gewerke(id, name, slug), objekt_einheiten(bezeichnung)'
  const basicSelect =
    'id, kunde_id, kunde_objekt_id, bezeichnung, gewerk_id, standort, objekt_einheit_id, einbau_datum, foto_url, notiz, status, sort_order, created_at, updated_at, gewerke(id, name, slug), objekt_einheiten(bezeichnung, etage)'
  const basicSelectNoEtage =
    'id, kunde_id, kunde_objekt_id, bezeichnung, gewerk_id, standort, objekt_einheit_id, einbau_datum, foto_url, notiz, status, sort_order, created_at, updated_at, gewerke(id, name, slug), objekt_einheiten(bezeichnung)'

  let res = await supabase
    .from('objekt_anlagen')
    .select(fullSelect)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)
    .order('sort_order', { ascending: true })
    .order('bezeichnung', { ascending: true })

  if (res.error && /etage/i.test(res.error.message)) {
    res = await supabase
      .from('objekt_anlagen')
      .select(fullSelectNoEtage)
      .eq('kunde_id', kundeId)
      .eq('kunde_objekt_id', objektId)
      .order('sort_order', { ascending: true })
      .order('bezeichnung', { ascending: true })
  }

  if (res.error && /garantie|gewaehrleistung|anschaffungswert|dokument_urls|hersteller|does not exist|Could not find/i.test(res.error.message)) {
    res = await supabase
      .from('objekt_anlagen')
      .select(basicSelect)
      .eq('kunde_id', kundeId)
      .eq('kunde_objekt_id', objektId)
      .order('sort_order', { ascending: true })
      .order('bezeichnung', { ascending: true })
    if (res.error && /etage/i.test(res.error.message)) {
      res = await supabase
        .from('objekt_anlagen')
        .select(basicSelectNoEtage)
        .eq('kunde_id', kundeId)
        .eq('kunde_objekt_id', objektId)
        .order('sort_order', { ascending: true })
        .order('bezeichnung', { ascending: true })
    }
  }

  if (res.error) {
    if (/objekt_anlagen|does not exist|Could not find/i.test(res.error.message)) {
      return []
    }
    console.warn('loadObjektAnlagen:', res.error.message)
    return []
  }

  const anlagen = (res.data ?? []) as ObjektAnlage[]
  if (!anlagen.length) return []

  const ids = anlagen.map((a) => a.id)
  const { data: countRows, error: countErr } = await supabase
    .from('leads')
    .select('objekt_anlage_id')
    .in('objekt_anlage_id', ids)

  if (countErr) {
    console.warn('loadObjektAnlagen counts:', countErr.message)
    return anlagen
  }

  const counts = (countRows ?? []).reduce<Record<string, number>>((acc, row) => {
    const id = String(row.objekt_anlage_id ?? '')
    if (!id) return acc
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  return anlagen.map((a) => ({
    ...a,
    dokument_urls: a.dokument_urls ?? [],
    vorgang_count: counts[a.id] ?? 0,
  }))
}

async function loadReadOnlyAkte(
  supabase: ReturnType<typeof createClient>,
  kundeId: string,
  objektId: string,
  leadId?: string | null
): Promise<ObjektAkteReadOnlyPayload> {
  const notizenQueries = [
    supabase
      .from('akten_notizen')
      .select('*')
      .eq('kunde_id', kundeId)
      .eq('bezug_typ', 'objekt')
      .eq('kunde_objekt_id', objektId)
      .order('created_at', { ascending: false }),
  ]

  if (leadId) {
    notizenQueries.push(
      supabase
        .from('akten_notizen')
        .select('*')
        .eq('kunde_id', kundeId)
        .eq('bezug_typ', 'vorgang')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
    )
  }

  const [objektNotizenRes, vorgangNotizenRes, dokumenteRes, fremdRes] = await Promise.all([
    notizenQueries[0],
    leadId ? notizenQueries[1] : Promise.resolve({ data: [], error: null }),
    supabase
      .from('objekt_dokumente')
      .select('id, kunde_id, kunde_objekt_id, kategorie, titel, storage_url, ablauf_datum, status, created_at')
      .eq('kunde_id', kundeId)
      .eq('kunde_objekt_id', objektId)
      .eq('status', 'aktiv')
      .order('ablauf_datum', { ascending: true, nullsFirst: false }),
    supabase
      .from('fremd_vorgaenge')
      .select('*')
      .eq('kunde_id', kundeId)
      .eq('kunde_objekt_id', objektId)
      .order('datum', { ascending: false }),
  ])

  const notizen = [
    ...((objektNotizenRes.data ?? []) as AktenNotiz[]),
    ...((vorgangNotizenRes?.data ?? []) as AktenNotiz[]),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (objektNotizenRes.error) {
    console.warn('loadReadOnlyAkte notizen:', objektNotizenRes.error.message)
  }
  if (dokumenteRes.error) {
    console.warn('loadReadOnlyAkte dokumente:', dokumenteRes.error.message)
  }
  if (fremdRes.error) {
    console.warn('loadReadOnlyAkte fremd:', fremdRes.error.message)
  }

  return {
    notizen,
    dokumente: (dokumenteRes.data ?? []) as ObjektDokument[],
    fremdVorgaenge: (fremdRes.data ?? []) as FremdVorgang[],
  }
}

export async function loadObjektAkteReadOnly(input: {
  kundeId: string
  objektId: string
  leadId?: string | null
}): Promise<ObjektAkteReadOnlyPayload> {
  const supabase = createClient()
  return loadReadOnlyAkte(supabase, input.kundeId.trim(), input.objektId.trim(), input.leadId)
}

export async function loadObjektAkteDetail(
  kundeId: string,
  objektId: string
): Promise<ObjektAkteDetailPayload | null> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return null

  const objekt = await loadKundenObjektForAkte(kid, oid)
  if (!objekt) return null

  const supabase = createClient()

  const [kontakteRes, einheitenRes, anlagenRes, readOnly, orgHausmeisterListe, hausmeisterAmObjekt] =
    await Promise.all([
      supabase
        .from('objekt_kontakte')
        .select('*')
        .eq('kunde_objekt_id', oid)
        .eq('aktiv', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('objekt_einheiten')
        .select('*')
        .eq('kunde_objekt_id', oid)
        .eq('aktiv', true)
        .order('sort_order', { ascending: true }),
      loadObjektAnlagen(supabase, kid, oid),
      loadReadOnlyAkte(supabase, kid, oid),
      listOrgHausmeister(kid),
      loadHausmeisterForObjekt(oid),
    ])

  const einheiten = (einheitenRes.data ?? []) as ObjektEinheit[]
  const einheitIds = einheiten.map((e) => e.id)

  let bewohner: EinheitBewohner[] = []
  if (einheitIds.length) {
    const { data: bewohnerData, error: bewohnerErr } = await supabase
      .from('einheit_bewohner')
      .select(
        '*, objekt_einheiten(bezeichnung, etage)'
      )
      .eq('kunde_id', kid)
      .in('objekt_einheit_id', einheitIds)
      .eq('aktiv', true)
      .is('anonymisiert_am', null)
      .order('created_at', { ascending: true })

    if (bewohnerErr) {
      // etage-Embed optional (ältere DBs ohne Spalte)
      if (/etage/i.test(bewohnerErr.message)) {
        const fallback = await supabase
          .from('einheit_bewohner')
          .select('*, objekt_einheiten(bezeichnung)')
          .eq('kunde_id', kid)
          .in('objekt_einheit_id', einheitIds)
          .eq('aktiv', true)
          .is('anonymisiert_am', null)
          .order('created_at', { ascending: true })
        if (fallback.error) {
          console.warn('loadObjektAkteDetail bewohner:', fallback.error.message)
        } else {
          bewohner = (fallback.data ?? []) as EinheitBewohner[]
        }
      } else {
        console.warn('loadObjektAkteDetail bewohner:', bewohnerErr.message)
      }
    } else {
      bewohner = (bewohnerData ?? []) as EinheitBewohner[]
    }
  }

  if (kontakteRes.error) {
    console.warn('loadObjektAkteDetail kontakte:', kontakteRes.error.message)
  }
  if (einheitenRes.error) {
    console.warn('loadObjektAkteDetail einheiten:', einheitenRes.error.message)
  }

  return {
    kontakte: (kontakteRes.data ?? []) as ObjektKontakt[],
    einheiten,
    bewohner,
    anlagen: anlagenRes,
    orgHausmeisterListe,
    hausmeisterAmObjekt,
    ...readOnly,
  }
}
