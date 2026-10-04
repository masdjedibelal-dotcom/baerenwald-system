'use server'

import { revalidateKundeDetail,revalidateKundeObjekt,revalidateLeadList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { OBJEKT_ANLAGE_STATUS,OBJEKT_KONTAKT_ROLLEN,OBJEKT_ANLAGE_WARTUNGSINTERVALL } from '@/lib/objektakte/labels'
import { resolveObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import type {
  EinheitBewohner,
  EinheitBewohnerInput,
  EinheitBewohnerRolle,
  ObjektAnlage,
  ObjektAnlageInput,
  ObjektAnlageStatus,
  ObjektAnlageVorgangRow,
  ObjektEinheit,
  ObjektEinheitInput,
  ObjektKontakt,
  ObjektKontaktInput,
  ObjektMieterInput,
} from '@/lib/objektakte/types'

async function assertObjektGehoertKunde(kundeId: string, objektId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .select('id')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:kunden_objekte', error)
  return Boolean(data)
}

async function assertEinheitGehoertObjekt(
  kundeId: string,
  objektId: string,
  einheitId: string
): Promise<boolean> {
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) return false
  const supabase = createClient()
  const { data, error } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('id', einheitId)
    .eq('kunde_objekt_id', objektId)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:objekt_einheiten', error)
  return Boolean(data)
}

function normalizeRolle(rolle?: EinheitBewohnerRolle | null): EinheitBewohnerRolle {
  return rolle === 'eigentuemer' ? 'eigentuemer' : 'mieter'
}

function validateKontaktInput(input: ObjektKontaktInput): string | null {
  const name = input.name?.trim()
  if (!name) return 'Name ist erforderlich.'
  if (!OBJEKT_KONTAKT_ROLLEN.includes(input.rolle)) return 'Ungültige Rolle.'
  return null
}

function validateBewohnerInput(input: EinheitBewohnerInput): string | null {
  if (!input.objekt_einheit_id?.trim()) return 'Einheit ist erforderlich.'
  if (!input.name?.trim()) return 'Name ist erforderlich.'
  return null
}

function revalidateObjektAkte(kundeId: string, objektId: string) {
  revalidateKundeDetail(kundeId)
  revalidateKundeObjekt(kundeId, objektId)
  revalidateLeadList()
}

function parseFlaeche(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

/** Insert Bewohner inkl. Rolle; Fallback ohne neue Spalten (ältere DBs). */
async function insertBewohnerRow(
  kundeId: string,
  einheitId: string,
  input: {
    name: string
    telefon?: string | null
    email?: string | null
    rolle?: EinheitBewohnerRolle
    sondereigentum_verwaltung?: boolean
    miete_hinweis?: string | null
  }
): Promise<{ data: EinheitBewohner | null; error: string | null }> {
  const supabase = createClient()
  const rolle = normalizeRolle(input.rolle)
  const insertRow: Record<string, unknown> = {
    kunde_id: kundeId,
    objekt_einheit_id: einheitId,
    name: input.name.trim(),
    telefon: input.telefon?.trim() || null,
    email: input.email?.trim() || null,
    rolle,
    sondereigentum_verwaltung:
      rolle === 'eigentuemer' ? Boolean(input.sondereigentum_verwaltung) : false,
    miete_hinweis: rolle === 'mieter' ? input.miete_hinweis?.trim() || null : null,
  }

  let { data, error } = await supabase
    .from('einheit_bewohner')
    .insert(insertRow)
    .select('*, objekt_einheiten(bezeichnung, etage)')
    .single()
  if (error) logDbError('app/actions/objektakte-actions:einheit_bewohner', error)

  if (error && /etage/i.test(error.message)) {
    const retry = await supabase
      .from('einheit_bewohner')
      .insert(insertRow)
      .select('*, objekt_einheiten(bezeichnung)')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error && /rolle|sondereigentum|miete_hinweis/i.test(error.message)) {
    const legacy = await supabase
      .from('einheit_bewohner')
      .insert({
        kunde_id: kundeId,
        objekt_einheit_id: einheitId,
        name: input.name.trim(),
        telefon: input.telefon?.trim() || null,
        email: input.email?.trim() || null,
      })
      .select('*, objekt_einheiten(bezeichnung)')
      .single()
    if (legacy.error || !legacy.data) {
      return { data: null, error: legacy.error?.message ?? 'Bewohner konnte nicht angelegt werden.' }
    }
    return {
      data: {
        ...(legacy.data as EinheitBewohner),
        rolle,
        sondereigentum_verwaltung:
          rolle === 'eigentuemer' ? Boolean(input.sondereigentum_verwaltung) : false,
        miete_hinweis: rolle === 'mieter' ? input.miete_hinweis?.trim() || null : null,
      },
      error: null,
    }
  }

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Bewohner konnte nicht angelegt werden.' }
  }
  return { data: data as EinheitBewohner, error: null }
}

export async function createObjektKontakt(
  kundeId: string,
  objektId: string,
  input: ObjektKontaktInput
): Promise<{ ok: true; kontakt: ObjektKontakt } | { ok: false; message: string }> {
  const err = validateKontaktInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('objekt_kontakte')
    .insert({
      kunde_id: kundeId,
      kunde_objekt_id: objektId,
      rolle: input.rolle,
      name: input.name.trim(),
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
      notiz: input.notiz?.trim() || null,
    })
    .select('*')
    .single()
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Kontakt konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, kontakt: data as ObjektKontakt }
}

export async function updateObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string,
  input: Partial<ObjektKontaktInput>
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.rolle && !OBJEKT_KONTAKT_ROLLEN.includes(input.rolle)) {
    return { ok: false, message: 'Ungültige Rolle.' }
  }
  if (input.name != null && !input.name.trim()) {
    return { ok: false, message: 'Name ist erforderlich.' }
  }

  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name != null) patch.name = input.name.trim()
  if (input.rolle != null) patch.rolle = input.rolle
  if (input.telefon != null) patch.telefon = input.telefon.trim() || null
  if (input.email != null) patch.email = input.email.trim() || null
  if (input.notiz != null) patch.notiz = input.notiz.trim() || null

  const { error } = await supabase
    .from('objekt_kontakte')
    .update(patch)
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function deleteObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('objekt_kontakte')
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

/** Soft-Delete rückgängig (Undo-Toast). */
export async function restoreObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('objekt_kontakte')
    .update({ aktiv: true, updated_at: new Date().toISOString() })
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

/** Person in fester Einheit anlegen (Portal: einheitId + rolle). */
export async function createEinheitBewohner(
  kundeId: string,
  objektId: string,
  input: EinheitBewohnerInput
): Promise<{ ok: true; bewohner: EinheitBewohner } | { ok: false; message: string }> {
  const err = validateBewohnerInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, input.objekt_einheit_id))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const { data, error } = await insertBewohnerRow(kundeId, input.objekt_einheit_id.trim(), input)
  if (error || !data) {
    return { ok: false, message: error ?? 'Bewohner konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, bewohner: data }
}

/**
 * Legacy: Mieter anlegen inkl. Einheit (Anfrage / KundenObjektModal).
 * Neue UI: createObjektEinheit + createEinheitBewohner.
 */
export async function createObjektMieter(
  kundeId: string,
  objektId: string,
  input: ObjektMieterInput
): Promise<
  | { ok: true; bewohner: EinheitBewohner; einheitId: string }
  | { ok: false; message: string }
> {
  const name = input.name?.trim()
  if (!name) return { ok: false, message: 'Name ist erforderlich.' }
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const bezeichnung = input.wohnung?.trim() || 'Allgemein'
  const etage = input.etage?.trim() || null
  const flaeche = parseFlaeche(input.wohnflaeche_m2 ?? null)
  const rolle = normalizeRolle(input.rolle)

  const supabase = createClient()

  const { data: existing, error } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('kunde_objekt_id', objektId)
    .eq('aktiv', true)
    .ilike('bezeichnung', bezeichnung)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:objekt_einheiten', error)

  let einheitId = existing?.id ?? ''
  if (!einheitId) {
    const created = await createObjektEinheit(kundeId, objektId, {
      bezeichnung,
      etage,
      wohnflaeche_m2: flaeche,
    })
    if (!created.ok) return created
    einheitId = created.einheit.id
  } else {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (flaeche != null) patch.wohnflaeche_m2 = flaeche
    if (etage) patch.etage = etage
    if (Object.keys(patch).length > 1) {
      const { error: upErr } = await supabase
        .from('objekt_einheiten')
        .update(patch)
        .eq('id', einheitId)
      if (upErr) logDbError('app/actions/objektakte-actions:objekt_einheiten', upErr)
      if (upErr && /etage/i.test(upErr.message) && flaeche != null) {
        const { error: __dbErr1 } = await supabase
          .from('objekt_einheiten')
          .update({ wohnflaeche_m2: flaeche, updated_at: new Date().toISOString() })
          .eq('id', einheitId)
        if (__dbErr1) logDbError('app/actions/objektakte-actions:objekt_einheiten', __dbErr1)
      }
    }
  }

  const { data, error: error2 } = await insertBewohnerRow(kundeId, einheitId, {
    name,
    telefon: input.telefon,
    email: input.email,
    rolle,
    sondereigentum_verwaltung: input.sondereigentum_verwaltung,
    miete_hinweis: input.miete_hinweis,
  })
  if (error2 || !data) {
    return { ok: false, message: error2 ?? 'Mieter konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, bewohner: data, einheitId }
}

/** E-Mail → bereits Portal-Konto (kunden.auth_user_id) vorhanden? */
export async function checkPortalEmailRegistered(
  email: string
): Promise<
  | { ok: true; registered: boolean; kundeId: string | null }
  | { ok: false; message: string }
> {
  const mail = email.trim().toLowerCase()
  if (!mail || !mail.includes('@')) {
    return { ok: true, registered: false, kundeId: null }
  }

  const { createClient } = await import('@/lib/supabase-server')
  const { data, error } = await (() => { const db = createClient(); return db
      .from('kunden')
      .select('id, auth_user_id')
      .ilike('email', mail)
      .not('auth_user_id', 'is', null)
      .limit(1)
      .maybeSingle() })()

  if (error) return { ok: false, message: error.message }
  const row = data as { id?: string; auth_user_id?: string | null } | null
  const kid = row?.id ? String(row.id) : null
  return {
    ok: true,
    registered: Boolean(kid && row?.auth_user_id),
    kundeId: kid,
  }
}

export async function createObjektEinheit(
  kundeId: string,
  objektId: string,
  input: ObjektEinheitInput
): Promise<{ ok: true; einheit: ObjektEinheit } | { ok: false; message: string }> {
  const bez = input.bezeichnung?.trim()
  if (!bez) return { ok: false, message: 'Bezeichnung ist erforderlich.' }
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const etage = input.etage?.trim() || null
  const flaeche = parseFlaeche(input.wohnflaeche_m2 ?? null)

  const supabase = createClient()
  const { data: maxRow, error: maxErr } = await supabase
    .from('objekt_einheiten')
    .select('sort_order')
    .eq('kunde_objekt_id', objektId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (maxErr) logDbError('app/actions/objektakte-actions:objekt_einheiten', maxErr)

  const base = {
    kunde_objekt_id: objektId,
    bezeichnung: bez,
    wohnflaeche_m2: flaeche,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  }

  let { data, error } = await supabase
    .from('objekt_einheiten')
    .insert({ ...base, etage })
    .select('*')
    .single()
  if (error) logDbError('app/actions/objektakte-actions:objekt_einheiten', error)

  if (error && /etage/i.test(error.message)) {
    const fallback = await supabase.from('objekt_einheiten').insert(base).select('*').single()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Einheit konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, einheit: data as ObjektEinheit }
}

export type BewohnerPrivatkundeLink = {
  bewohnerId: string
  bewohnerName: string
  rolle: string | null
  einheitId: string
  einheitBezeichnung: string
  objektId: string
  objektTitel: string
  hvKundeId: string
  hvName: string
}

/** Rückwärts: Privatkunde → verknüpfte Bewohner-Zeilen (für Kunden-Detail). */
export async function loadBewohnerLinksForPrivatkunde(
  privatKundeId: string
): Promise<BewohnerPrivatkundeLink[]> {
  const kid = privatKundeId.trim()
  if (!kid) return []

  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from('einheit_bewohner')
    .select('id, name, rolle, kunde_id, objekt_einheit_id')
    .eq('portal_kunde_id', kid)
    .eq('aktiv', true)
    .is('anonymisiert_am', null)
  if (error) logDbError('app/actions/objektakte-actions:einheit_bewohner', error)

  if (error) {
    console.warn('loadBewohnerLinksForPrivatkunde:', error.message)
    return []
  }
  if (!rows?.length) return []

  const einheitIds = [...new Set(rows.map((r) => r.objekt_einheit_id as string).filter(Boolean))]
  const { data: einheiten, error: error2 } = await supabase
    .from('objekt_einheiten')
    .select('id, bezeichnung, kunde_objekt_id')
    .in('id', einheitIds)
  if (error2) logDbError('app/actions/objektakte-actions:objekt_einheiten', error2)

  const objektIds = [
    ...new Set((einheiten ?? []).map((e) => e.kunde_objekt_id as string).filter(Boolean)),
  ]
  const { data: objekte } = objektIds.length
    ? await supabase.from('kunden_objekte').select('id, titel, kunde_id').in('id', objektIds)
    : { data: [] as { id: string; titel: string; kunde_id: string }[] }

  const hvIds = [...new Set((objekte ?? []).map((o) => o.kunde_id as string).filter(Boolean))]
  const { data: hvs } = hvIds.length
    ? await supabase.from('kunden').select('id, name, vorname, nachname, typ').in('id', hvIds)
    : { data: [] as { id: string; name: string | null; vorname: string | null; nachname: string | null; typ: string | null }[] }

  const { kundeDisplayName } = await import('@/lib/kunde-stammdaten')
  const einheitById = new Map((einheiten ?? []).map((e) => [e.id as string, e]))
  const objektById = new Map((objekte ?? []).map((o) => [o.id as string, o]))
  const hvById = new Map((hvs ?? []).map((h) => [h.id as string, h]))

  const out: BewohnerPrivatkundeLink[] = []
  for (const row of rows) {
    const einheit = einheitById.get(row.objekt_einheit_id as string)
    if (!einheit) continue
    const objekt = objektById.get(einheit.kunde_objekt_id as string)
    if (!objekt) continue
    const hv = hvById.get(objekt.kunde_id as string)
    out.push({
      bewohnerId: row.id as string,
      bewohnerName: (row.name as string) || '—',
      rolle: (row.rolle as string | null) ?? null,
      einheitId: einheit.id as string,
      einheitBezeichnung: (einheit.bezeichnung as string) || '—',
      objektId: objekt.id as string,
      objektTitel: (objekt.titel as string) || '—',
      hvKundeId: (hv?.id as string) ?? (objekt.kunde_id as string),
      hvName: hv ? kundeDisplayName(hv) : '—',
    })
  }
  return out
}

async function assertAnlageGehoertObjekt(
  kundeId: string,
  objektId: string,
  anlageId: string
): Promise<boolean> {
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) return false
  const supabase = createClient()
  const { data, error } = await supabase
    .from('objekt_anlagen')
    .select('id')
    .eq('id', anlageId)
    .eq('kunde_objekt_id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:objekt_anlagen', error)
  return Boolean(data)
}

function normalizeAnlageStatus(status?: ObjektAnlageStatus | null): ObjektAnlageStatus {
  if (status === 'ausgetauscht' || status === 'stillgelegt') return status
  return 'aktiv'
}

function validateAnlageInput(input: ObjektAnlageInput): string | null {
  if (!input.bezeichnung?.trim()) return 'Bezeichnung ist erforderlich.'
  if (!input.gewerk_id?.trim()) return 'Gewerk ist erforderlich.'
  if (input.status && !OBJEKT_ANLAGE_STATUS.includes(input.status)) {
    return 'Ungültiger Status.'
  }
  return null
}

function parseEinbauDatum(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  if (/^\d{4}$/.test(v)) return `${v}-01-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return null
}

function parseIsoDate(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return null
}

function parseAnschaffungswert(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\./g, '').replace(',', '.').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function normalizeWartungsintervall(
  value: string | null | undefined
): (typeof OBJEKT_ANLAGE_WARTUNGSINTERVALL)[number] | null {
  const v = value?.trim()
  if (!v || v === 'keins') return v === 'keins' ? 'keins' : null
  return (OBJEKT_ANLAGE_WARTUNGSINTERVALL as readonly string[]).includes(v)
    ? (v as (typeof OBJEKT_ANLAGE_WARTUNGSINTERVALL)[number])
    : null
}

function normalizeDokumentUrls(urls: string[] | null | undefined): string[] {
  if (!urls?.length) return []
  return urls.map((u) => u.trim()).filter(Boolean).slice(0, 20)
}

const ANLAGE_DETAIL_COLUMNS = [
  'hersteller',
  'modell',
  'seriennummer',
  'anschaffungswert_eur',
  'garantie_bis',
  'gewaehrleistung_bis',
  'wartungsintervall',
  'letzte_wartung_am',
  'dokument_urls',
] as const

function stripAnlageDetailFields(row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row }
  for (const key of ANLAGE_DETAIL_COLUMNS) delete copy[key]
  return copy
}

function isObjektEinheitEtageSchemaError(message: string): boolean {
  return /objekt_einheiten.*etage|etage.*does not exist|column.*etage/i.test(message)
}

function isAnlageDetailSchemaError(message: string): boolean {
  if (isObjektEinheitEtageSchemaError(message)) return false
  return /garantie|gewaehrleistung|anschaffungswert|dokument_urls|hersteller|wartungsintervall|does not exist|Could not find|schema cache/i.test(
    message
  )
}

const ANLAGE_SELECT_WITH_ETAGE =
  '*, gewerke(id, name, slug), objekt_einheiten(bezeichnung, etage)'
const ANLAGE_SELECT_WITHOUT_ETAGE =
  '*, gewerke(id, name, slug), objekt_einheiten(bezeichnung)'

async function selectAnlageAfterWrite(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  id: string
): Promise<{ data: ObjektAnlage | null; error: string | null }> {
  const full = await supabase
    .from('objekt_anlagen')
    .select(ANLAGE_SELECT_WITH_ETAGE)
    .eq('id', id)
    .maybeSingle()
  if (!full.error && full.data) {
    return { data: full.data as ObjektAnlage, error: null }
  }
  if (full.error && isObjektEinheitEtageSchemaError(full.error.message)) {
    const basic = await supabase
      .from('objekt_anlagen')
      .select(ANLAGE_SELECT_WITHOUT_ETAGE)
      .eq('id', id)
      .maybeSingle()
    if (!basic.error && basic.data) {
      return { data: basic.data as ObjektAnlage, error: null }
    }
    return { data: null, error: basic.error?.message ?? full.error.message }
  }
  return { data: null, error: full.error?.message ?? 'Anlage nicht geladen.' }
}

function anlageRowFromInput(
  kundeId: string,
  objektId: string,
  input: ObjektAnlageInput,
  sortOrder: number
): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    kunde_id: kundeId,
    kunde_objekt_id: objektId,
    bezeichnung: input.bezeichnung.trim(),
    gewerk_id: input.gewerk_id.trim(),
    standort: input.standort?.trim() || null,
    objekt_einheit_id: input.objekt_einheit_id?.trim() || null,
    einbau_datum: parseEinbauDatum(input.einbau_datum),
    foto_url: input.foto_url?.trim() || null,
    notiz: input.notiz?.trim() || null,
    hersteller: input.hersteller?.trim() || null,
    modell: input.modell?.trim() || null,
    seriennummer: input.seriennummer?.trim() || null,
    anschaffungswert_eur: parseAnschaffungswert(input.anschaffungswert_eur),
    garantie_bis: parseIsoDate(input.garantie_bis),
    gewaehrleistung_bis: parseIsoDate(input.gewaehrleistung_bis),
    wartungsintervall: normalizeWartungsintervall(input.wartungsintervall ?? null),
    letzte_wartung_am: parseIsoDate(input.letzte_wartung_am),
    dokument_urls: normalizeDokumentUrls(input.dokument_urls),
    status: normalizeAnlageStatus(input.status),
    sort_order: sortOrder,
    updated_at: now,
  }
}

export async function createObjektAnlage(
  kundeId: string,
  objektId: string,
  input: ObjektAnlageInput
): Promise<{ ok: true; anlage: ObjektAnlage } | { ok: false; message: string }> {
  const err = validateAnlageInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const einheitId = input.objekt_einheit_id?.trim() || null
  if (
    einheitId &&
    !(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))
  ) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const supabase = createClient()
  const { data: maxRow, error } = await supabase
    .from('objekt_anlagen')
    .select('sort_order')
    .eq('kunde_objekt_id', objektId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:objekt_anlagen', error)

  const now = new Date().toISOString()
  const row = {
    ...anlageRowFromInput(kundeId, objektId, input, (maxRow?.sort_order ?? -1) + 1),
    updated_at: now,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('objekt_anlagen')
    .insert(row)
    .select('id')
    .single()
  if (insertError) logDbError('app/actions/objektakte-actions:objekt_anlagen', insertError)

  let anlageId = inserted?.id ? String(inserted.id) : ''
  let lastError = insertError?.message ?? null

  if ((!anlageId || insertError) && isAnlageDetailSchemaError(insertError?.message ?? '')) {
    const retry = await supabase
      .from('objekt_anlagen')
      .insert(stripAnlageDetailFields(row))
      .select('id')
      .single()
    if (!retry.error && retry.data?.id) {
      anlageId = String(retry.data.id)
      lastError = null
    } else {
      lastError = retry.error?.message ?? lastError
    }
  }

  if (!anlageId) {
    return { ok: false, message: lastError ?? 'Anlage konnte nicht angelegt werden.' }
  }

  const loaded = await selectAnlageAfterWrite(supabase, anlageId)
  if (!loaded.data) {
    return { ok: false, message: loaded.error ?? 'Anlage angelegt, aber nicht lesbar.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  const anlage = {
    ...loaded.data,
    dokument_urls: loaded.data.dokument_urls ?? [],
    vorgang_count: 0,
  }
  return { ok: true, anlage }
}

export async function loadObjektAnlageVorgaenge(
  kundeId: string,
  objektId: string,
  anlageId: string
): Promise<{ ok: true; rows: ObjektAnlageVorgangRow[] } | { ok: false; message: string }> {
  if (!(await assertAnlageGehoertObjekt(kundeId, objektId, anlageId))) {
    return { ok: false, message: 'Anlage nicht gefunden.' }
  }

  const supabase = createClient()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, created_at, status, anlass, situation, bereiche')
    .eq('objekt_anlage_id', anlageId)
    .order('created_at', { ascending: false })
  if (error) logDbError('app/actions/objektakte-actions:leads', error)

  if (error) return { ok: false, message: error.message }

  const leadIds = (leads ?? []).map((l) => String(l.id)).filter(Boolean)
  if (!leadIds.length) return { ok: true, rows: [] }

  const [{ data: angebote }, { data: auftraege }] = await Promise.all([
    supabase
      .from('angebote')
      .select('id, lead_id, status, gesamt_fix, gesamt_min, gesamt_max, leistungsumfang, notizen')
      .in('lead_id', leadIds),
    supabase.from('auftraege').select('id, lead_id, angebot_id, status').in('lead_id', leadIds),
  ])
  const auftragIds = (auftraege ?? []).map((a) => String(a.id)).filter(Boolean)
  const angebotIds = (angebote ?? []).map((a) => String(a.id)).filter(Boolean)
  let rechnungen: Array<{
    auftrag_id?: string | null
    angebot_id?: string | null
    status: string
    brutto?: number | null
    rechnung_art?: string | null
    created_at: string
    updated_at?: string | null
  }> = []
  if (auftragIds.length || angebotIds.length) {
    let q = supabase
      .from('rechnungen')
      .select('auftrag_id, angebot_id, status, brutto, rechnung_art, created_at, updated_at')
    if (auftragIds.length && angebotIds.length) {
      q = q.or(`auftrag_id.in.(${auftragIds.join(',')}),angebot_id.in.(${angebotIds.join(',')})`)
    } else if (auftragIds.length) {
      q = q.in('auftrag_id', auftragIds)
    } else {
      q = q.in('angebot_id', angebotIds)
    }
    const { data } = await q
    rechnungen = (data ?? []) as typeof rechnungen
  }

  const angeboteByLead = new Map<string, NonNullable<typeof angebote>>()
  for (const a of angebote ?? []) {
    const lid = String(a.lead_id ?? '')
    if (!lid) continue
    const list = angeboteByLead.get(lid) ?? []
    list.push(a)
    angeboteByLead.set(lid, list)
  }
  const auftraegeByLead = new Map<string, NonNullable<typeof auftraege>>()
  for (const a of auftraege ?? []) {
    const lid = String(a.lead_id ?? '')
    if (!lid) continue
    const list = auftraegeByLead.get(lid) ?? []
    list.push(a)
    auftraegeByLead.set(lid, list)
  }

  const rows: ObjektAnlageVorgangRow[] = (leads ?? []).map((l) => {
    const lid = String(l.id)
    const leadAuf = auftraegeByLead.get(lid) ?? []
    const leadAng = angeboteByLead.get(lid) ?? []
    const aufIds = new Set(leadAuf.map((a) => String(a.id)))
    const angIds = new Set(leadAng.map((a) => String(a.id)))
    const recs = rechnungen.filter(
      (r) =>
        (r.auftrag_id && aufIds.has(String(r.auftrag_id))) ||
        (r.angebot_id && angIds.has(String(r.angebot_id)))
    )
    const kosten = resolveObjektVorgangKosten({
      rechnungen: recs,
      auftraege: leadAuf as Array<{ status: string; angebot_id?: string | null }>,
      angebote: leadAng as Array<{
        id?: string
        status?: string
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
      }>,
    })
    return {
      id: lid,
      titel: angebotTitelOderSituationBereich({
        angebot: leadAng[0]
          ? {
              leistungsumfang: (leadAng[0] as { leistungsumfang?: string | null }).leistungsumfang,
              notizen: (leadAng[0] as { notizen?: string | null }).notizen,
            }
          : null,
        situation: (l.situation as string | null) ?? null,
        bereiche: (l.bereiche as string[] | null) ?? null,
      }),
      created_at: l.created_at as string,
      status: (l.status as string | null) ?? null,
      phase: (l.anlass as string | null) ?? null,
      kosten_label: kosten.label,
    }
  })

  return { ok: true, rows }
}

export async function fetchObjektAnlagenForPicker(
  kundeId: string,
  objektId: string
): Promise<ObjektAnlage[]> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return []
  if (!(await assertObjektGehoertKunde(kid, oid))) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('objekt_anlagen')
    .select('*, gewerke(id, name, slug)')
    .eq('kunde_id', kid)
    .eq('kunde_objekt_id', oid)
    .neq('status', 'stillgelegt')
    .order('bezeichnung', { ascending: true })
  if (error) logDbError('app/actions/objektakte-actions:objekt_anlagen', error)

  if (error) {
    console.warn('fetchObjektAnlagenForPicker:', error.message)
    return []
  }
  return (data ?? []) as ObjektAnlage[]
}
