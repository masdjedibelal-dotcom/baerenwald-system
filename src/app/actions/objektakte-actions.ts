'use server'

import { revalidateKundeDetail,revalidateKundeObjekt,revalidateLeadList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { OBJEKT_KONTAKT_ROLLEN } from '@/lib/objektakte/labels'
import type {
  EinheitBewohner,
  EinheitBewohnerInput,
  EinheitBewohnerRolle,
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

