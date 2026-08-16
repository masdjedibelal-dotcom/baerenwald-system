'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { saveCustomValue as persistCustomFieldValue } from '@/lib/custom-fields'
import {
  buildKundeStammDbPayload,
  istKundeHausverwaltungTyp,
  validateKundeStammPflicht,
  type SaveKundeStammInput,
} from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

/** Lange Auth-Sperre (gleiche Dauer wie bei deaktivierten CRM-Mitarbeitern). */
const AUTH_BAN_DURATION = '876600h'

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

function applyHausverwaltungDefaults(
  payload: Record<string, unknown>,
  typ: string,
  opts?: { isCreate?: boolean }
) {
  if (!istKundeHausverwaltungTyp(typ)) return
  payload.portal_modus = 'organisation'
  // Freigabe-Regeln nur bei Neuanlage setzen — sonst überschreibt Stammdaten-Speichern den Org-Tab
  if (opts?.isCreate) {
    payload.freigabe_modus = 'freigabe'
    payload.freigabe_schwelle_eur = 500
    // Explizit true: Akut/Notfall → Direktauftrag (kein NULL-Drift mit „unset = an“)
    payload.notfall_direkt = true
    payload.kleinreparaturen_ohne_angebot = false
  }
  // Registrierungs-/Stammadresse → Portal-Profil (org_*)
  if (payload.strasse !== undefined) payload.org_strasse = payload.strasse
  if (payload.hausnummer !== undefined) payload.org_hausnummer = payload.hausnummer
  if (payload.plz !== undefined) payload.org_plz = payload.plz
  if (payload.ort !== undefined) payload.org_ort = payload.ort
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
  applyHausverwaltungDefaults(payload, data.typ, { isCreate: !kundeId })

  if (!kundeId && (data.typ === 'gewerbe' || istKundeHausverwaltungTyp(data.typ))) {
    payload.portal_modus = 'organisation'
  }

  if (kundeId) {
    const { error } = await withCrmReadFallback(async (db) =>
      db.from('kunden').update(payload).eq('id', kundeId)
    )
    if (error) return { ok: false, message: error.message }
    // Kundentyp an verknüpfte Anfragen nachziehen (Filter/Angebot-Logik)
    const typ = String(data.typ ?? '').trim()
    if (typ) {
      await withCrmReadFallback(async (db) =>
        db
          .from('leads')
          .update({ kundentyp: typ, updated_at: new Date().toISOString() })
          .or(`kunde_id.eq.${kundeId},auftraggeber_kunde_id.eq.${kundeId}`)
          .in('status', ['neu', 'kontaktiert', 'termin', 'angebot'])
      )
    }
    revalidatePath('/kunden')
    revalidatePath(`/kunden/${kundeId}`)
    revalidatePath('/vorgaenge')
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

/**
 * Kunde als Spam markieren / zurücknehmen.
 * Spam → kein Rechner, kein Portal-Login/-Register; bestehendes Auth-Konto wird gesperrt.
 */
export async function setKundeSpam(
  kundeId: string,
  istSpam: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = kundeId?.trim()
  if (!id) return { ok: false, message: 'Kunde fehlt.' }

  const { data: row, error: loadErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('id, auth_user_id, email').eq('id', id).maybeSingle()
  )
  if (loadErr || !row) {
    return { ok: false, message: loadErr?.message ?? 'Kunde nicht gefunden.' }
  }

  const { error: upErr } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .update({
        ist_spam: istSpam,
        spam_markiert_am: istSpam ? new Date().toISOString() : null,
      })
      .eq('id', id)
  )
  if (upErr) {
    const msg = upErr.message ?? ''
    if (msg.includes('ist_spam') || msg.includes('does not exist') || msg.includes('schema cache')) {
      return {
        ok: false,
        message: 'Spam-Spalte fehlt in der Datenbank — bitte Migration kunden_ist_spam ausführen.',
      }
    }
    return { ok: false, message: upErr.message }
  }

  const authUserId = (row as { auth_user_id?: string | null }).auth_user_id?.trim()
  if (authUserId) {
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      ban_duration: istSpam ? AUTH_BAN_DURATION : 'none',
    })
    if (banErr) {
      console.error('[setKundeSpam] Auth-Ban fehlgeschlagen:', banErr.message)
    }
    if (istSpam) {
      try {
        const admin = supabaseAdmin.auth.admin as {
          signOut?: (uid: string, scope?: string) => Promise<unknown>
        }
        if (typeof admin.signOut === 'function') {
          await admin.signOut(authUserId, 'global')
        }
      } catch (e) {
        console.error('[setKundeSpam] Sign-out fehlgeschlagen:', e)
      }
    }
  }

  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  return { ok: true }
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
  const { istHvPortalRollenKunde } = await import('@/lib/kunde-stammdaten')

  for (const column of ['name', 'email'] as const) {
    const { data } = await withCrmReadFallback(async (db) =>
      db
        .from('kunden')
        .select('id, name, vorname, nachname, typ, email, portal_modus')
        .ilike(column, pct)
        .limit(8)
    )
    for (const row of data ?? []) {
      if (!row?.id) continue
      if (istHvPortalRollenKunde((row as { portal_modus?: string | null }).portal_modus)) {
        continue
      }
      byId.set(
        row.id as string,
        row as Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname' | 'typ' | 'email'>
      )
      if (byId.size >= 8) break
    }
    if (byId.size >= 8) break
  }

  return Array.from(byId.values()).slice(0, 8)
}

/** Stammdaten-Kopie für Listen-⋯-Menü. */
function isMissingTableError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('does not exist') || m.includes('schema cache')
}

function strEmpty(v: unknown): boolean {
  return v == null || (typeof v === 'string' && !v.trim())
}

async function repointKundeFk(
  db: SupabaseClient,
  table: string,
  column: string,
  mergeId: string,
  survivorId: string
): Promise<string | null> {
  const { error } = await db.from(table).update({ [column]: survivorId }).eq(column, mergeId)
  if (!error) return null
  if (isMissingTableError(error.message)) return null
  return `${table}.${column}: ${error.message}`
}

async function repointKundenObjekte(
  db: SupabaseClient,
  mergeId: string,
  survivorId: string
): Promise<void> {
  const { data, error } = await db.from('kunden_objekte').select('id').eq('kunde_id', mergeId)
  if (error) {
    if (!isMissingTableError(error.message)) {
      console.warn('[mergeKunden] kunden_objekte laden:', error.message)
    }
    return
  }
  for (const row of data ?? []) {
    const id = (row as { id: string }).id
    const { error: upErr } = await db
      .from('kunden_objekte')
      .update({ kunde_id: survivorId })
      .eq('id', id)
    if (upErr) {
      console.warn('[mergeKunden] kunden_objekt übersprungen', id, upErr.message)
    }
  }
}

async function repointKundenMitglieder(
  db: SupabaseClient,
  mergeId: string,
  survivorId: string
): Promise<void> {
  const { data, error } = await db.from('kunden_mitglieder').select('id').eq('kunde_id', mergeId)
  if (error) {
    if (!isMissingTableError(error.message)) {
      console.warn('[mergeKunden] kunden_mitglieder laden:', error.message)
    }
    return
  }
  for (const row of data ?? []) {
    const id = (row as { id: string }).id
    const { error: upErr } = await db
      .from('kunden_mitglieder')
      .update({ kunde_id: survivorId })
      .eq('id', id)
    if (upErr) {
      console.warn('[mergeKunden] kunden_mitglied übersprungen', id, upErr.message)
    }
  }
}

/**
 * Kunde mergeId in survivorId überführen (Vorgänge, Objekte, …); mergeId wird gelöscht.
 */
export async function mergeKunden(
  survivorId: string,
  mergeId: string
): Promise<
  { ok: true; message: string; survivorId: string } | { ok: false; message: string }
> {
  const survivor = survivorId?.trim()
  const merge = mergeId?.trim()
  if (!survivor || !merge) {
    return { ok: false, message: 'Kunden-IDs fehlen.' }
  }
  if (survivor === merge) {
    return { ok: false, message: 'Derselbe Kunde kann nicht mit sich zusammengeführt werden.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'Nicht angemeldet.' }
  }

  const { data: rows, error: loadErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('*').in('id', [survivor, merge])
  )
  if (loadErr) return { ok: false, message: loadErr.message }
  const list = (rows ?? []) as Record<string, unknown>[]
  const survRow = list.find((r) => r.id === survivor)
  const mergeRow = list.find((r) => r.id === merge)
  if (!survRow || !mergeRow) {
    return { ok: false, message: 'Ein oder beide Kunden wurden nicht gefunden.' }
  }

  const fkSteps: Array<{ table: string; column: string }> = [
    { table: 'leads', column: 'kunde_id' },
    { table: 'leads', column: 'auftraggeber_kunde_id' },
    { table: 'angebote', column: 'kunde_id' },
    { table: 'auftraege', column: 'kunde_id' },
    { table: 'rechnungen', column: 'kunde_id' },
  ]

  for (const step of fkSteps) {
    const { data: fkErr } = await withCrmReadFallback(async (db) => {
      const msg = await repointKundeFk(db, step.table, step.column, merge, survivor)
      return { data: msg, error: null }
    })
    if (fkErr) return { ok: false, message: fkErr }
  }

  await withCrmReadFallback(async (db) => {
    await repointKundenObjekte(db, merge, survivor)
    return { data: null, error: null }
  })
  for (const opt of [
    { table: 'kunden_notizen', column: 'kunde_id' },
    { table: 'kunden_dokumente', column: 'kunde_id' },
    { table: 'email_logs', column: 'kunde_id' },
  ] as const) {
    const { data: fkErr } = await withCrmReadFallback(async (db) => {
      const msg = await repointKundeFk(db, opt.table, opt.column, merge, survivor)
      return { data: msg, error: null }
    })
    if (fkErr) return { ok: false, message: fkErr }
  }
  await withCrmReadFallback(async (db) => {
    await repointKundenMitglieder(db, merge, survivor)
    return { data: null, error: null }
  })

  // Ansprechpartner des Merge-Kunden zum Survivor umhängen
  await withCrmReadFallback(async (db) => {
    await db
      .from('kunden_ansprechpartner')
      .update({ kunde_id: survivor })
      .eq('kunde_id', merge)
    return { data: null, error: null }
  })

  // Kontaktdaten des aufgelösten Kunden als Ansprechpartner am Survivor anlegen
  {
    const mergeName =
      [mergeRow.vorname, mergeRow.nachname].filter((x) => !strEmpty(x)).join(' ').trim() ||
      String(mergeRow.name ?? '').trim() ||
      String(mergeRow.ansprechpartner ?? '').trim() ||
      'Ehemaliger Kontakt'
    const mergeEmail = strEmpty(mergeRow.email) ? null : String(mergeRow.email).trim()
    const mergeTel = strEmpty(mergeRow.telefon) ? null : String(mergeRow.telefon).trim()
    const survivorEmail = strEmpty(survRow.email) ? null : String(survRow.email).trim().toLowerCase()
    const sameAsSurvivorMail =
      Boolean(mergeEmail) &&
      Boolean(survivorEmail) &&
      mergeEmail!.toLowerCase() === survivorEmail

    if (!sameAsSurvivorMail && (mergeEmail || mergeTel || mergeName !== 'Ehemaliger Kontakt')) {
      let existingApId: string | null = null
      if (mergeEmail) {
        const { data: existingAp } = await withCrmReadFallback(async (db) =>
          db
            .from('kunden_ansprechpartner')
            .select('id')
            .eq('kunde_id', survivor)
            .ilike('email', mergeEmail)
            .limit(1)
            .maybeSingle()
        )
        existingApId = (existingAp as { id: string } | null)?.id ?? null
      }
      if (!existingApId) {
        await withCrmReadFallback(async (db) =>
          db.from('kunden_ansprechpartner').insert({
            kunde_id: survivor,
            name: mergeName,
            email: mergeEmail,
            telefon: mergeTel,
            rolle: 'Zusammengeführt',
            ist_primaer: false,
          })
        )
      }
    }
  }

  const patch: Record<string, unknown> = {}
  const fillKeys = [
    'email',
    'telefon',
    'adresse',
    'strasse',
    'hausnummer',
    'plz',
    'ort',
    'vorname',
    'nachname',
    'name',
    'webseite',
    'ansprechpartner',
    'quelle',
    'ust_id',
  ] as const
  for (const key of fillKeys) {
    if (strEmpty(survRow[key]) && !strEmpty(mergeRow[key])) {
      patch[key] = mergeRow[key]
    }
  }
  if (strEmpty(survRow.auth_user_id) && !strEmpty(mergeRow.auth_user_id)) {
    patch.auth_user_id = mergeRow.auth_user_id
  }
  if (strEmpty(survRow.notizen) && !strEmpty(mergeRow.notizen)) {
    patch.notizen = mergeRow.notizen
  } else if (!strEmpty(survRow.notizen) && !strEmpty(mergeRow.notizen)) {
    const a = String(survRow.notizen).trim()
    const b = String(mergeRow.notizen).trim()
    if (!a.includes(b)) {
      patch.notizen = `${a}\n\n--- Zusammengeführt ---\n${b}`
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error: patchErr } = await withCrmReadFallback(async (db) =>
      db.from('kunden').update(patch).eq('id', survivor)
    )
    if (patchErr) return { ok: false, message: patchErr.message }
  }

  const { error: delErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').delete().eq('id', merge)
  )
  if (delErr) {
    return {
      ok: false,
      message:
        delErr.message +
        ' — Verknüpfungen wurden ggf. bereits umgehängt; bitte manuell prüfen.',
    }
  }

  await updateGesamtUmsatz(survivor)

  revalidatePath('/kunden')
  revalidatePath(`/kunden/${survivor}`)
  revalidatePath('/vorgaenge')
  revalidatePath('/anfragen')
  revalidatePath('/angebote')
  revalidatePath('/auftraege')
  revalidatePath('/rechnungen')

  return {
    ok: true,
    survivorId: survivor,
    message: 'Kunden wurden zusammengeführt.',
  }
}

export async function duplicateKunde(
  kundeId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data: src, error: loadErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('*').eq('id', kundeId).maybeSingle()
  )
  if (loadErr || !src) return { ok: false, message: loadErr?.message ?? 'Kunde nicht gefunden.' }

  const row = src as Record<string, unknown>
  const payload: Record<string, unknown> = { ...row }
  delete payload.id
  delete payload.created_at
  delete payload.updated_at
  delete payload.auth_user_id
  delete payload.kundennummer
  delete payload.gesamt_umsatz
  delete payload.letzte_aktivitaet
  delete payload.spam_markiert_am
  payload.ist_spam = false
  payload.name = row.name ? `Kopie: ${String(row.name)}` : 'Kopie'
  if (payload.email) payload.email = null

  const { data: inserted, error: insErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').insert(payload).select('id').single()
  )
  if (insErr || !inserted) return { ok: false, message: insErr?.message ?? 'Kopie fehlgeschlagen.' }

  const id = (inserted as { id: string }).id
  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  return { ok: true, id }
}

/**
 * Kunde löschen inkl. aller Vorgänge (Anfragen, Angebote, Aufträge, Rechnungen).
 * Notizen, Dokumente, Objekte (Cascade) gehen mit.
 */
export async function deleteKunde(
  kundeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = kundeId.trim()
  if (!id) return { ok: false, message: 'Kunden-ID fehlt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: row, error: loadErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('id, auth_user_id').eq('id', id).maybeSingle()
  )
  if (loadErr || !row) {
    return { ok: false, message: loadErr?.message ?? 'Kunde nicht gefunden.' }
  }

  const [{ data: leadsAlsKunde }, { data: leadsAlsAg }] = await Promise.all([
    supabaseAdmin.from('leads').select('id').eq('kunde_id', id),
    supabaseAdmin.from('leads').select('id').eq('auftraggeber_kunde_id', id),
  ])
  const leadIds = Array.from(
    new Set(
      [...(leadsAlsKunde ?? []), ...(leadsAlsAg ?? [])]
        .map((l) => String(l.id ?? '').trim())
        .filter(Boolean)
    )
  )

  const { hardDeleteLeadCascade } = await import('@/lib/portal/soft-delete-lead')
  const vorgangErrors: string[] = []
  for (const leadId of leadIds) {
    const r = await hardDeleteLeadCascade(leadId)
    if (!r.ok) vorgangErrors.push(r.message)
  }
  if (vorgangErrors.length) {
    return {
      ok: false,
      message: `Vorgänge konnten nicht vollständig gelöscht werden:\n${vorgangErrors
        .slice(0, 5)
        .join('\n')}`,
    }
  }

  const [{ data: restAuftraege }, { data: restAngebote }, { data: restRechnungen }] =
    await Promise.all([
      supabaseAdmin.from('auftraege').select('id').eq('kunde_id', id),
      supabaseAdmin.from('angebote').select('id').eq('kunde_id', id),
      supabaseAdmin.from('rechnungen').select('id').eq('kunde_id', id),
    ])

  const restAuftragIds = (restAuftraege ?? []).map((a) => String(a.id))
  const restAngebotIds = (restAngebote ?? []).map((a) => String(a.id))
  const restRechnungIds = (restRechnungen ?? []).map((r) => String(r.id))

  if (restRechnungIds.length) {
    const { error } = await supabaseAdmin
      .from('rechnungen')
      .delete()
      .in('id', restRechnungIds)
    if (error) return { ok: false, message: `rechnungen: ${error.message}` }
  }

  if (restAngebotIds.length) {
    await supabaseAdmin
      .from('angebot_handwerker')
      .delete()
      .in('angebot_id', restAngebotIds)
    const { error } = await supabaseAdmin
      .from('angebote')
      .delete()
      .in('id', restAngebotIds)
    if (error) return { ok: false, message: `angebote: ${error.message}` }
  }

  if (restAuftragIds.length) {
    await supabaseAdmin
      .from('kalender_termine')
      .delete()
      .in('auftrag_id', restAuftragIds)
    const { error } = await supabaseAdmin
      .from('auftraege')
      .delete()
      .in('id', restAuftragIds)
    if (error) return { ok: false, message: `auftraege: ${error.message}` }
  }

  for (const table of [
    'kunden_notizen',
    'kunden_dokumente',
    'kunden_objekte',
    'kunden_mitglieder',
  ] as const) {
    const { error } = await supabaseAdmin.from(table).delete().eq('kunde_id', id)
    if (error && !/does not exist|relation|schema cache/i.test(error.message)) {
      return { ok: false, message: `${table}: ${error.message}` }
    }
  }

  const authUserId = String(
    (row as { auth_user_id?: string | null }).auth_user_id ?? ''
  ).trim()
  if (authUserId) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    } catch (e) {
      console.warn('[deleteKunde] auth delete:', e)
    }
  }

  // HV-Glocken vor Kunden-Zeile entfernen
  await supabaseAdmin.from('hv_notifications').delete().eq('kunde_id', id)

  const { error: delErr } = await supabaseAdmin.from('kunden').delete().eq('id', id)
  if (delErr) return { ok: false, message: delErr.message }

  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  revalidatePath('/vorgaenge')
  revalidatePath('/anfragen')
  revalidatePath('/angebote')
  revalidatePath('/auftraege')
  revalidatePath('/rechnungen')
  return { ok: true }
}
