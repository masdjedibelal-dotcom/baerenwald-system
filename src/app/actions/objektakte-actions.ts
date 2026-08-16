'use server'

import { revalidatePath } from 'next/cache'
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
  const { data } = await supabase
    .from('kunden_objekte')
    .select('id')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  return Boolean(data)
}

async function assertEinheitGehoertObjekt(
  kundeId: string,
  objektId: string,
  einheitId: string
): Promise<boolean> {
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) return false
  const supabase = createClient()
  const { data } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('id', einheitId)
    .eq('kunde_objekt_id', objektId)
    .maybeSingle()
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
  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath(`/kunden/${kundeId}/objekte/${objektId}`)
  revalidatePath('/anfragen')
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

  const { data: existing } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('kunde_objekt_id', objektId)
    .eq('aktiv', true)
    .ilike('bezeichnung', bezeichnung)
    .maybeSingle()

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
      if (upErr && /etage/i.test(upErr.message) && flaeche != null) {
        await supabase
          .from('objekt_einheiten')
          .update({ wohnflaeche_m2: flaeche, updated_at: new Date().toISOString() })
          .eq('id', einheitId)
      }
    }
  }

  const { data, error } = await insertBewohnerRow(kundeId, einheitId, {
    name,
    telefon: input.telefon,
    email: input.email,
    rolle,
    sondereigentum_verwaltung: input.sondereigentum_verwaltung,
    miete_hinweis: input.miete_hinweis,
  })
  if (error || !data) {
    return { ok: false, message: error ?? 'Mieter konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, bewohner: data, einheitId }
}

export async function updateEinheitBewohner(
  kundeId: string,
  objektId: string,
  bewohnerId: string,
  input: Partial<
    Pick<
      EinheitBewohnerInput,
      'name' | 'telefon' | 'email' | 'rolle' | 'sondereigentum_verwaltung' | 'miete_hinweis'
    >
  >
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.name != null && !input.name.trim()) {
    return { ok: false, message: 'Name ist erforderlich.' }
  }

  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name != null) patch.name = input.name.trim()
  if (input.telefon != null) patch.telefon = input.telefon.trim() || null
  if (input.email != null) patch.email = input.email.trim() || null
  if (input.rolle != null) {
    const rolle = normalizeRolle(input.rolle)
    patch.rolle = rolle
    if (rolle === 'eigentuemer') {
      if (input.sondereigentum_verwaltung !== undefined) {
        patch.sondereigentum_verwaltung = Boolean(input.sondereigentum_verwaltung)
      }
      if (input.miete_hinweis !== undefined) patch.miete_hinweis = null
    } else {
      if (input.miete_hinweis !== undefined) {
        patch.miete_hinweis = input.miete_hinweis?.trim() || null
      }
      if (input.sondereigentum_verwaltung !== undefined) {
        patch.sondereigentum_verwaltung = false
      }
    }
  } else {
    if (input.sondereigentum_verwaltung !== undefined) {
      patch.sondereigentum_verwaltung = Boolean(input.sondereigentum_verwaltung)
    }
    if (input.miete_hinweis !== undefined) {
      patch.miete_hinweis = input.miete_hinweis?.trim() || null
    }
  }

  let { error } = await supabase
    .from('einheit_bewohner')
    .update(patch)
    .eq('id', bewohnerId)
    .eq('kunde_id', kundeId)

  if (error && /rolle|sondereigentum|miete_hinweis/i.test(error.message)) {
    const legacy: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.name != null) legacy.name = input.name.trim()
    if (input.telefon != null) legacy.telefon = input.telefon.trim() || null
    if (input.email != null) legacy.email = input.email.trim() || null
    const retry = await supabase
      .from('einheit_bewohner')
      .update(legacy)
      .eq('id', bewohnerId)
      .eq('kunde_id', kundeId)
    error = retry.error
  }

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function deleteEinheitBewohner(
  kundeId: string,
  objektId: string,
  bewohnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('einheit_bewohner')
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq('id', bewohnerId)
    .eq('kunde_id', kundeId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
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
  const { data: maxRow } = await supabase
    .from('objekt_einheiten')
    .select('sort_order')
    .eq('kunde_objekt_id', objektId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

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

export async function updateObjektEinheit(
  kundeId: string,
  objektId: string,
  einheitId: string,
  input: { bezeichnung?: string; etage?: string | null; wohnflaeche_m2?: number | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.bezeichnung != null) {
    const bez = input.bezeichnung.trim()
    if (!bez) return { ok: false, message: 'Bezeichnung ist erforderlich.' }
    patch.bezeichnung = bez
  }
  if (input.etage !== undefined) {
    patch.etage = input.etage?.trim() || null
  }
  if (input.wohnflaeche_m2 !== undefined) {
    patch.wohnflaeche_m2 = parseFlaeche(input.wohnflaeche_m2)
  }

  const supabase = createClient()
  let { error } = await supabase
    .from('objekt_einheiten')
    .update(patch)
    .eq('id', einheitId)
    .eq('kunde_objekt_id', objektId)

  if (error && /etage/i.test(error.message)) {
    const withoutEtage = { ...patch }
    delete withoutEtage.etage
    const retry = await supabase
      .from('objekt_einheiten')
      .update(withoutEtage)
      .eq('id', einheitId)
      .eq('kunde_objekt_id', objektId)
    error = retry.error
  }

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function deleteObjektEinheit(
  kundeId: string,
  objektId: string,
  einheitId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }
  const supabase = createClient()
  const now = new Date().toISOString()

  // Zugeordnete Personen mit-deaktivieren (wie Portal)
  await supabase
    .from('einheit_bewohner')
    .update({ aktiv: false, updated_at: now })
    .eq('objekt_einheit_id', einheitId)
    .eq('kunde_id', kundeId)

  const { error } = await supabase
    .from('objekt_einheiten')
    .update({ aktiv: false, updated_at: now })
    .eq('id', einheitId)
    .eq('kunde_objekt_id', objektId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}
