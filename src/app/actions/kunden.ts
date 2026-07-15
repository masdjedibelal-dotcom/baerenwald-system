'use server'

import { revalidatePath } from 'next/cache'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { saveCustomValue as persistCustomFieldValue } from '@/lib/custom-fields'
import {
  buildKundeStammDbPayload,
  validateKundeStammPflicht,
  type SaveKundeStammInput,
} from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

export type SaveKundeInput = SaveKundeStammInput & {
  telefon?: string | null
  email?: string | null
  webseite?: string | null
  ansprechpartner?: string | null
  geburtstag?: string | null
  quelle?: string | null
  notizen?: string | null
  ust_id?: string | null
  /** Wenn false: kein harter Pflichtcheck (z. B. schneller Entwurf) */
  stammPflicht?: boolean
}

/** Optionale Spalten nur mitschicken wenn gesetzt — vermeidet API-Fehler wenn Migration noch fehlt. */
function optionalKundeFeld(
  payload: Record<string, unknown>,
  key: string,
  value: string | null | undefined
) {
  const t = value?.trim()
  if (t) payload[key] = t
}

function sanitizeKundePayload(input: SaveKundeInput): Record<string, unknown> {
  const stamm = buildKundeStammDbPayload(input)
  const payload: Record<string, unknown> = {
    ...stamm,
    typ: input.typ,
    telefon: input.telefon?.trim() || null,
    email: input.email?.trim() || null,
    notizen: input.notizen?.trim() || null,
  }
  optionalKundeFeld(payload, 'webseite', input.webseite)
  optionalKundeFeld(payload, 'ansprechpartner', input.ansprechpartner)
  optionalKundeFeld(payload, 'geburtstag', input.geburtstag)
  optionalKundeFeld(payload, 'quelle', input.quelle)
  optionalKundeFeld(payload, 'ust_id', input.ust_id)
  return payload
}

function applyHausverwaltungDefaults(payload: Record<string, unknown>, typ: string) {
  if (typ !== 'hausverwaltung') return
  payload.portal_modus = 'organisation'
  payload.freigabe_modus = 'freigabe'
  payload.freigabe_schwelle_eur = null
  payload.notfall_direkt = false
}

export async function saveKunde(
  data: SaveKundeInput,
  kundeId?: string,
  options?: { revalidateAnfrageIds?: string[] }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (data.stammPflicht !== false) {
    const err = validateKundeStammPflicht(data)
    if (err) return { ok: false, message: err }
  }
  const payload = sanitizeKundePayload(data)
  applyHausverwaltungDefaults(payload, data.typ)

  if (!kundeId && (data.typ === 'gewerbe' || data.typ === 'hausverwaltung')) {
    payload.portal_modus = 'organisation'
  }

  if (kundeId) {
    const { error } = await withCrmReadFallback(async (db) =>
      db.from('kunden').update(payload).eq('id', kundeId)
    )
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kunden')
    revalidatePath(`/kunden/${kundeId}`)
    for (const lid of options?.revalidateAnfrageIds ?? []) {
      revalidatePath(`/anfragen/${lid}`)
      revalidatePath('/anfragen')
    }
    return { ok: true, id: kundeId }
  }

  const { data: row, error } = await withCrmReadFallback(async (db) =>
    db.from('kunden').insert(payload).select('id').single()
  )
  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  const id = (row as { id: string }).id
  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  for (const lid of options?.revalidateAnfrageIds ?? []) {
    revalidatePath(`/anfragen/${lid}`)
    revalidatePath('/anfragen')
  }
  return { ok: true, id }
}

export async function addKundenNotiz(
  kundeId: string,
  inhalt: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = inhalt.trim()
  if (!text) return { ok: false, message: 'Notiz darf nicht leer sein.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('kunden_notizen').insert({
    kunde_id: kundeId,
    inhalt: text,
    erstellt_von: user?.id ?? null,
  })
  if (error) return { ok: false, message: error.message }

  await withCrmReadFallback(async (db) =>
    db.from('kunden').update({ letzte_aktivitaet: new Date().toISOString() }).eq('id', kundeId)
  )

  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/kunden')
  return { ok: true }
}

export async function deleteKundenNotiz(
  notizId: string,
  kundeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('kunden_notizen').delete().eq('id', notizId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/kunden/${kundeId}`)
  return { ok: true }
}

export async function updateGesamtUmsatz(
  kundeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('brutto')
    .eq('kunde_id', kundeId)
    .eq('status', 'bezahlt')

  if (error) return { ok: false, message: error.message }

  const summe = (data ?? []).reduce((s, r) => s + (Number(r.brutto) || 0), 0)

  const { error: uErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').update({ gesamt_umsatz: summe }).eq('id', kundeId)
  )

  if (uErr) return { ok: false, message: uErr.message }
  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/kunden')
  return { ok: true }
}

export async function saveKundeCustomFieldValue(
  definitionId: string,
  objektId: string,
  wert: string
) {
  const res = await persistCustomFieldValue(definitionId, objektId, wert)
  if (res.ok) {
    revalidatePath(`/kunden/${objektId}`)
  }
  return res
}

export async function findKundenDuplikate(
  telefon: string | null,
  email: string | null,
  excludeKundeId?: string
): Promise<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>[]> {
  const { findStammdatenDuplikate } = await import('@/app/actions/stammdaten-kontakt')
  const rows = await findStammdatenDuplikate('kunde', {
    email,
    telefon,
    excludeTyp: 'kunde',
    excludeId: excludeKundeId,
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    telefon: r.telefon,
    email: r.email,
  }))
}

/** Portal-Zugang: Kunde registriert sich mit derselben E-Mail unter /portal/login */
export async function getPortalLoginHint(
  kundeId: string
): Promise<
  | { ok: true; loginLink: string; hasAuthAccount: boolean }
  | { ok: false; message: string }
> {
  const { data: row, error } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('auth_user_id').eq('id', kundeId).maybeSingle()
  )

  if (error) return { ok: false, message: error.message }

  const { buildPortalLoginLink } = await import('@/lib/portal-utils')
  return {
    ok: true,
    loginLink: buildPortalLoginLink(),
    hasAuthAccount: Boolean(
      (row as { auth_user_id?: string | null } | null)?.auth_user_id
    ),
  }
}

/** Globale Suche (Cmd+K) — Server Action wegen RLS-Fallback auf kunden. */
export async function searchKundenGlobal(
  term: string
): Promise<Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname' | 'typ' | 'email'>[]> {
  const q = term.trim().slice(0, 80).replace(/[%]/g, '')
  if (q.length < 2) return []
  const pct = `%${q}%`
  const byId = new Map<string, Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname' | 'typ' | 'email'>>()

  for (const column of ['name', 'email'] as const) {
    const { data } = await withCrmReadFallback(async (db) =>
      db.from('kunden').select('id, name, vorname, nachname, typ, email').ilike(column, pct).limit(4)
    )
    for (const row of data ?? []) {
      if (row?.id) {
        byId.set(row.id as string, row as Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname' | 'typ' | 'email'>)
      }
    }
  }

  return Array.from(byId.values())
}
