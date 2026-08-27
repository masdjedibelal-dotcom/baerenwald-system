'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { OBJEKT_ANLAGE_STATUS, OBJEKT_KONTAKT_ROLLEN, OBJEKT_ANLAGE_WARTUNGSINTERVALL } from '@/lib/objektakte/labels'
import { resolveObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
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

/**
 * Bestehenden Eigentümer (andere Einheit desselben Objekts) an diese Einheit hängen.
 * Kopiert Stammdaten + portal_kunde_id in eine neue einheit_bewohner-Zeile.
 */
export async function assignExistingEigentuemerToEinheit(
  kundeId: string,
  objektId: string,
  input: {
    einheitId: string
    sourceBewohnerId: string
    sondereigentum_verwaltung?: boolean
  }
): Promise<
  | { ok: true; bewohner: EinheitBewohner }
  | { ok: false; message: string }
> {
  const einheitId = input.einheitId.trim()
  const sourceId = input.sourceBewohnerId.trim()
  if (!einheitId || !sourceId) {
    return { ok: false, message: 'Einheit und Eigentümer sind erforderlich.' }
  }
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const supabase = createClient()
  const { data: source, error: srcErr } = await supabase
    .from('einheit_bewohner')
    .select(
      'id, name, email, telefon, portal_kunde_id, sondereigentum_verwaltung, rolle, objekt_einheit_id, aktiv'
    )
    .eq('id', sourceId)
    .eq('kunde_id', kundeId)
    .eq('aktiv', true)
    .maybeSingle()

  if (srcErr || !source?.id) {
    return { ok: false, message: 'Eigentümer nicht gefunden.' }
  }
  if (String(source.rolle) !== 'eigentuemer') {
    return { ok: false, message: 'Quelle ist kein Eigentümer.' }
  }

  // Quelle muss zu einer Einheit dieses Objekts gehören
  const { data: srcEinheit } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('id', String(source.objekt_einheit_id))
    .eq('kunde_objekt_id', objektId)
    .maybeSingle()
  if (!srcEinheit?.id) {
    return { ok: false, message: 'Eigentümer gehört nicht zu diesem Objekt.' }
  }

  if (String(source.objekt_einheit_id) === einheitId) {
    return { ok: false, message: 'Eigentümer ist dieser Einheit bereits zugeordnet.' }
  }

  const portalId =
    source.portal_kunde_id != null ? String(source.portal_kunde_id).trim() : ''
  const email = source.email != null ? String(source.email).trim() : ''

  let alreadyQ = supabase
    .from('einheit_bewohner')
    .select('id')
    .eq('objekt_einheit_id', einheitId)
    .eq('kunde_id', kundeId)
    .eq('rolle', 'eigentuemer')
    .eq('aktiv', true)
    .is('anonymisiert_am', null)

  if (portalId) {
    alreadyQ = alreadyQ.eq('portal_kunde_id', portalId)
  } else if (email) {
    alreadyQ = alreadyQ.ilike('email', email)
  } else {
    alreadyQ = alreadyQ.eq('id', source.id)
  }

  const { data: already } = await alreadyQ.maybeSingle()
  if (already?.id) {
    return { ok: false, message: 'Eigentümer ist dieser Einheit bereits zugeordnet.' }
  }

  const se =
    input.sondereigentum_verwaltung !== undefined
      ? Boolean(input.sondereigentum_verwaltung)
      : Boolean(source.sondereigentum_verwaltung)

  const insertRow: Record<string, unknown> = {
    kunde_id: kundeId,
    objekt_einheit_id: einheitId,
    name: String(source.name ?? '').trim() || 'Eigentümer',
    email: email || null,
    telefon: source.telefon != null ? String(source.telefon).trim() || null : null,
    rolle: 'eigentuemer',
    sondereigentum_verwaltung: se,
    portal_kunde_id: portalId || null,
    aktiv: true,
  }

  let { data, error } = await supabase
    .from('einheit_bewohner')
    .insert(insertRow)
    .select('*, objekt_einheiten(bezeichnung, etage)')
    .single()

  if (error && /portal_kunde_id/i.test(error.message)) {
    delete insertRow.portal_kunde_id
    const retry = await supabase
      .from('einheit_bewohner')
      .insert(insertRow)
      .select('*, objekt_einheiten(bezeichnung, etage)')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error && /etage/i.test(error.message)) {
    const retry = await supabase
      .from('einheit_bewohner')
      .insert(insertRow)
      .select('*, objekt_einheiten(bezeichnung)')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Zuordnung fehlgeschlagen.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, bewohner: data as EinheitBewohner }
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

  const { withCrmReadFallback } = await import('@/lib/kunden/kunden-db')
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .select('id, auth_user_id')
      .ilike('email', mail)
      .not('auth_user_id', 'is', null)
      .limit(1)
      .maybeSingle()
  )

  if (error) return { ok: false, message: error.message }
  const row = data as { id?: string; auth_user_id?: string | null } | null
  const kid = row?.id ? String(row.id) : null
  return {
    ok: true,
    registered: Boolean(kid && row?.auth_user_id),
    kundeId: kid,
  }
}

/**
 * Portal-Einladung für Mieter/Eigentümer anlegen (mailto öffnet HV-Mail-App).
 */
export async function inviteEinheitBewohnerPortal(
  kundeId: string,
  objektId: string,
  bewohnerId: string,
  opts?: { hvName?: string | null; objektLabel?: string | null }
): Promise<
  | { ok: true; url: string; mailto: string }
  | { ok: false; message: string }
> {
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const supabase = createClient()
  const { data: bewohner, error: bErr } = await supabase
    .from('einheit_bewohner')
    .select('id, name, email, rolle, objekt_einheit_id, aktiv')
    .eq('id', bewohnerId)
    .eq('kunde_id', kundeId)
    .eq('aktiv', true)
    .maybeSingle()

  if (bErr || !bewohner?.id) {
    return { ok: false, message: 'Person nicht gefunden.' }
  }

  const email = String(bewohner.email ?? '').trim()
  if (!email) {
    return { ok: false, message: 'E-Mail ist für die Einladung erforderlich.' }
  }

  const einheitId = String(bewohner.objekt_einheit_id)
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const { data: einheit } = await supabase
    .from('objekt_einheiten')
    .select('bezeichnung')
    .eq('id', einheitId)
    .maybeSingle()

  const {
    createPortalEinladungToken,
    portalEinladungExpiresAt,
    buildPortalEinladungUrl,
    buildBewohnerPortalEinladungMailto,
  } = await import('@/lib/portal/portal-einladungen')

  const token = createPortalEinladungToken()
  const expires_at = portalEinladungExpiresAt().toISOString()
  const { data, error } = await supabase
    .from('portal_einladungen')
    .insert({
      token,
      kunde_id: kundeId,
      objekt_id: objektId,
      einheit_id: einheitId,
      einheit_ref: einheit?.bezeichnung?.trim() || null,
      bewohner_id: bewohnerId,
      status: 'offen',
      expires_at,
    })
    .select('token')
    .single()

  if (error) {
    const missing = /portal_einladungen|does not exist|relation/i.test(error.message)
    return {
      ok: false,
      message: missing
        ? 'Einladungs-Tabelle noch nicht freigeschaltet (Migration).'
        : error.message,
    }
  }

  const t = String(data?.token ?? token)
  const url = buildPortalEinladungUrl(t)
  const rolle = String(bewohner.rolle) === 'eigentuemer' ? 'eigentuemer' : 'mieter'
  const mailto = buildBewohnerPortalEinladungMailto({
    link: url,
    hvName: opts?.hvName?.trim() || 'Ihre Verwaltung',
    objektLabel: opts?.objektLabel?.trim() || 'Objekt',
    einheitRef: einheit?.bezeichnung?.trim() || null,
    toEmail: email,
    rolle,
  })

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, url, mailto }
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

export type PrivatkundeFromBewohnerResult =
  | { ok: true; kundeId: string; created: boolean }
  | {
      ok: false
      code: 'already_linked' | 'email_exists' | 'email_hv' | 'error'
      message: string
      existingKundeId?: string
      existingKundeName?: string
      existingKundeTyp?: string
      linkedKundeId?: string
    }

function splitBewohnerName(full: string): { vorname: string | null; nachname: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { vorname: null, nachname: null }
  if (parts.length === 1) return { vorname: parts[0], nachname: null }
  return { vorname: parts[0], nachname: parts.slice(1).join(' ') }
}

async function loadBewohnerForObjekt(
  hvKundeId: string,
  objektId: string,
  bewohnerId: string
): Promise<EinheitBewohner | null> {
  if (!(await assertObjektGehoertKunde(hvKundeId, objektId))) return null
  const supabase = createClient()
  const { data } = await supabase
    .from('einheit_bewohner')
    .select('*, objekt_einheiten!inner(id, bezeichnung, kunde_objekt_id)')
    .eq('id', bewohnerId)
    .eq('kunde_id', hvKundeId)
    .eq('aktiv', true)
    .maybeSingle()
  if (!data) return null
  const einheit = data.objekt_einheiten as
    | { id: string; bezeichnung: string; kunde_objekt_id: string }
    | { id: string; bezeichnung: string; kunde_objekt_id: string }[]
    | null
  const einheitRow = Array.isArray(einheit) ? einheit[0] : einheit
  if (!einheitRow || einheitRow.kunde_objekt_id !== objektId) return null
  return data as EinheitBewohner
}

/**
 * Bewohner → Privatkunde (CRM-Stamm). Setzt portal_kunde_id.
 * Portal bleibt HV-Kontext; keine Multi-Objekt-Logik.
 */
export async function createPrivatkundeFromBewohner(
  hvKundeId: string,
  objektId: string,
  bewohnerId: string,
  opts?: { linkExistingKundeId?: string }
): Promise<PrivatkundeFromBewohnerResult> {
  const bewohner = await loadBewohnerForObjekt(hvKundeId, objektId, bewohnerId)
  if (!bewohner) {
    return { ok: false, code: 'error', message: 'Person nicht gefunden.' }
  }

  const linked = bewohner.portal_kunde_id?.trim()
  if (linked) {
    return {
      ok: false,
      code: 'already_linked',
      message: 'Bereits mit einem Privatkunden verknüpft.',
      linkedKundeId: linked,
    }
  }

  const supabase = createClient()
  const { istKundeHausverwaltungTyp, kundeDisplayName } = await import('@/lib/kunde-stammdaten')

  const linkId = opts?.linkExistingKundeId?.trim()
  if (linkId) {
    const { data: existing } = await supabase
      .from('kunden')
      .select('id, name, vorname, nachname, typ, email')
      .eq('id', linkId)
      .maybeSingle()
    if (!existing) {
      return { ok: false, code: 'error', message: 'Kunde nicht gefunden.' }
    }
    if (istKundeHausverwaltungTyp(existing.typ as string)) {
      return {
        ok: false,
        code: 'email_hv',
        message:
          'Diese E-Mail gehört einer Hausverwaltung — bitte nicht als Privatkunde verknüpfen.',
        existingKundeId: existing.id as string,
        existingKundeName: kundeDisplayName(existing),
        existingKundeTyp: String(existing.typ ?? ''),
      }
    }
    const { error } = await supabase
      .from('einheit_bewohner')
      .update({ portal_kunde_id: linkId, updated_at: new Date().toISOString() })
      .eq('id', bewohnerId)
      .eq('kunde_id', hvKundeId)
    if (error) return { ok: false, code: 'error', message: error.message }
    revalidateObjektAkte(hvKundeId, objektId)
    revalidatePath(`/kunden/${linkId}`)
    return { ok: true, kundeId: linkId, created: false }
  }

  const email = bewohner.email?.trim() || null
  if (email) {
    const { data: byMail } = await supabase
      .from('kunden')
      .select('id, name, vorname, nachname, typ, email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    if (byMail?.id) {
      if (istKundeHausverwaltungTyp(byMail.typ as string)) {
        return {
          ok: false,
          code: 'email_hv',
          message:
            'Diese E-Mail gehört einer Hausverwaltung. Privatkunde nicht anlegen — Mail prüfen.',
          existingKundeId: byMail.id as string,
          existingKundeName: kundeDisplayName(byMail),
          existingKundeTyp: String(byMail.typ ?? ''),
        }
      }
      return {
        ok: false,
        code: 'email_exists',
        message: 'Es gibt bereits einen Kunden mit dieser E-Mail. Verknüpfen?',
        existingKundeId: byMail.id as string,
        existingKundeName: kundeDisplayName(byMail),
        existingKundeTyp: String(byMail.typ ?? ''),
      }
    }
  }

  const { vorname, nachname } = splitBewohnerName(bewohner.name)
  const { data: created, error: createErr } = await supabase
    .from('kunden')
    .insert({
      name: null,
      vorname,
      nachname,
      email,
      telefon: bewohner.telefon?.trim() || null,
      typ: 'privat',
      portal_modus: 'privat',
      adresse: null,
      plz: null,
      ort: null,
      notizen: null,
    })
    .select('id')
    .single()

  if (createErr || !created?.id) {
    return {
      ok: false,
      code: 'error',
      message: createErr?.message ?? 'Privatkunde konnte nicht angelegt werden.',
    }
  }

  const newId = created.id as string
  const { error: linkErr } = await supabase
    .from('einheit_bewohner')
    .update({ portal_kunde_id: newId, updated_at: new Date().toISOString() })
    .eq('id', bewohnerId)
    .eq('kunde_id', hvKundeId)

  if (linkErr) {
    return { ok: false, code: 'error', message: linkErr.message }
  }

  revalidateObjektAkte(hvKundeId, objektId)
  revalidatePath(`/kunden/${newId}`)
  return { ok: true, kundeId: newId, created: true }
}

/** Bestehenden Kunden mit Bewohner verknüpfen (nach email_exists). */
export async function linkPrivatkundeToBewohner(
  hvKundeId: string,
  objektId: string,
  bewohnerId: string,
  privatKundeId: string
): Promise<PrivatkundeFromBewohnerResult> {
  return createPrivatkundeFromBewohner(hvKundeId, objektId, bewohnerId, {
    linkExistingKundeId: privatKundeId,
  })
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

  if (error) {
    console.warn('loadBewohnerLinksForPrivatkunde:', error.message)
    return []
  }
  if (!rows?.length) return []

  const einheitIds = [...new Set(rows.map((r) => r.objekt_einheit_id as string).filter(Boolean))]
  const { data: einheiten } = await supabase
    .from('objekt_einheiten')
    .select('id, bezeichnung, kunde_objekt_id')
    .in('id', einheitIds)

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
  const { data } = await supabase
    .from('objekt_anlagen')
    .select('id')
    .eq('id', anlageId)
    .eq('kunde_objekt_id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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
  const { data: maxRow } = await supabase
    .from('objekt_anlagen')
    .select('sort_order')
    .eq('kunde_objekt_id', objektId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

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

export async function updateObjektAnlage(
  kundeId: string,
  objektId: string,
  anlageId: string,
  input: ObjektAnlageInput
): Promise<{ ok: true; anlage: ObjektAnlage } | { ok: false; message: string }> {
  const err = validateAnlageInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertAnlageGehoertObjekt(kundeId, objektId, anlageId))) {
    return { ok: false, message: 'Anlage nicht gefunden.' }
  }

  const einheitId = input.objekt_einheit_id?.trim() || null
  if (
    einheitId &&
    !(await assertEinheitGehoertObjekt(kundeId, objektId, einheitId))
  ) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const supabase = createClient()
  const patch = {
    ...anlageRowFromInput(kundeId, objektId, input, 0),
  }
  delete (patch as { sort_order?: number }).sort_order

  const { error } = await supabase
    .from('objekt_anlagen')
    .update(patch)
    .eq('id', anlageId)

  let lastError = error?.message ?? null

  if (error && isAnlageDetailSchemaError(error.message)) {
    const retry = await supabase
      .from('objekt_anlagen')
      .update(stripAnlageDetailFields(patch))
      .eq('id', anlageId)
    if (retry.error) {
      return { ok: false, message: retry.error.message }
    }
    lastError = null
  } else if (error) {
    return { ok: false, message: error.message }
  }

  const loaded = await selectAnlageAfterWrite(supabase, anlageId)
  if (!loaded.data) {
    return { ok: false, message: loaded.error ?? lastError ?? 'Anlage nicht geladen.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, anlage: loaded.data }
}

export async function deleteObjektAnlage(
  kundeId: string,
  objektId: string,
  anlageId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await assertAnlageGehoertObjekt(kundeId, objektId, anlageId))) {
    return { ok: false, message: 'Anlage nicht gefunden.' }
  }

  const supabase = createClient()
  const [{ count: leadCount }, { count: angebotCount }, { count: rechnungCount }] =
    await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('objekt_anlage_id', anlageId),
      supabase
        .from('angebote')
        .select('id', { count: 'exact', head: true })
        .eq('objekt_anlage_id', anlageId),
      supabase
        .from('rechnungen')
        .select('id', { count: 'exact', head: true })
        .eq('objekt_anlage_id', anlageId),
    ])

  const linked = (leadCount ?? 0) + (angebotCount ?? 0) + (rechnungCount ?? 0)
  if (linked > 0) {
    return {
      ok: false,
      message:
        'Anlage ist mit Vorgängen verknüpft — bitte Status auf „Stillgelegt“ setzen statt löschen.',
    }
  }

  const { error } = await supabase.from('objekt_anlagen').delete().eq('id', anlageId)
  if (error) return { ok: false, message: error.message }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
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
    .select('id, titel, created_at, status, anlass')
    .eq('objekt_anlage_id', anlageId)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, message: error.message }

  const leadIds = (leads ?? []).map((l) => String(l.id)).filter(Boolean)
  if (!leadIds.length) return { ok: true, rows: [] }

  const [{ data: angebote }, { data: auftraege }] = await Promise.all([
    supabase
      .from('angebote')
      .select('id, lead_id, status, gesamt_fix, gesamt_min, gesamt_max')
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
      titel: (l.titel as string)?.trim() || 'Vorgang',
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

  if (error) {
    console.warn('fetchObjektAnlagenForPicker:', error.message)
    return []
  }
  return (data ?? []) as ObjektAnlage[]
}
