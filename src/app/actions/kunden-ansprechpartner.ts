'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { KundeAnsprechpartner } from '@/lib/types'

export type SaveAnsprechpartnerInput = {
  name: string
  email?: string | null
  telefon?: string | null
  rolle?: string | null
  ist_primaer?: boolean
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

async function requireAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet.' }
  return { ok: true as const }
}

/** Legacy-Feld `kunden.ansprechpartner` = Name des Primären (oder null). */
async function syncKundeLegacyAnsprechpartnerFeld(kundeId: string): Promise<void> {
  const kid = kundeId.trim()
  if (!kid) return
  const { data: primary } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden_ansprechpartner')
      .select('name')
      .eq('kunde_id', kid)
      .eq('ist_primaer', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()
  )
  const name =
    primary && typeof primary === 'object' && 'name' in primary
      ? String((primary as { name?: string | null }).name ?? '').trim() || null
      : null
  await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .update({ ansprechpartner: name, updated_at: new Date().toISOString() })
      .eq('id', kid)
  )
}

export async function listKundenAnsprechpartner(
  kundeId: string
): Promise<KundeAnsprechpartner[]> {
  const id = kundeId.trim()
  if (!id) return []
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden_ansprechpartner')
      .select('*')
      .eq('kunde_id', id)
      .order('ist_primaer', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
  )
  if (error) {
    console.warn('[listKundenAnsprechpartner]', error.message)
    return []
  }
  return (data ?? []) as KundeAnsprechpartner[]
}

export async function saveKundenAnsprechpartner(
  kundeId: string,
  input: SaveAnsprechpartnerInput,
  ansprechpartnerId?: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const auth = await requireAuth()
  if (!auth.ok) return auth

  const kid = kundeId.trim()
  const name = normalizeName(input.name)
  if (!kid) return { ok: false, message: 'Kunde fehlt.' }
  if (!name) return { ok: false, message: 'Name ist Pflicht.' }

  const email = input.email?.trim() || null
  const telefon = input.telefon?.trim() || null
  const rolle = input.rolle?.trim() || null
  const istPrimaer = Boolean(input.ist_primaer)

  if (istPrimaer) {
    await withCrmReadFallback(async (db) =>
      db.from('kunden_ansprechpartner').update({ ist_primaer: false }).eq('kunde_id', kid)
    )
  }

  if (ansprechpartnerId?.trim()) {
    const patch: Record<string, unknown> = {
      name,
      email,
      telefon,
      rolle,
      ist_primaer: istPrimaer,
      updated_at: new Date().toISOString(),
    }
    if (istPrimaer) patch.sort_order = 0
    const { error } = await withCrmReadFallback(async (db) =>
      db
        .from('kunden_ansprechpartner')
        .update(patch)
        .eq('id', ansprechpartnerId.trim())
        .eq('kunde_id', kid)
    )
    if (error) return { ok: false, message: error.message }
    await syncKundeLegacyAnsprechpartnerFeld(kid)
    revalidatePath(`/kunden/${kid}`)
    return { ok: true, id: ansprechpartnerId.trim() }
  }

  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden_ansprechpartner')
      .insert({
        kunde_id: kid,
        name,
        email,
        telefon,
        rolle,
        ist_primaer: istPrimaer,
        sort_order: istPrimaer ? 0 : 100,
      })
      .select('id')
      .single()
  )
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen.' }
  await syncKundeLegacyAnsprechpartnerFeld(kid)
  revalidatePath(`/kunden/${kid}`)
  return { ok: true, id: String((data as { id: string }).id) }
}

export async function deleteKundenAnsprechpartner(
  kundeId: string,
  ansprechpartnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  const kid = kundeId.trim()
  const aid = ansprechpartnerId.trim()
  if (!kid || !aid) return { ok: false, message: 'IDs fehlen.' }

  const { error } = await withCrmReadFallback(async (db) =>
    db.from('kunden_ansprechpartner').delete().eq('id', aid).eq('kunde_id', kid)
  )
  if (error) return { ok: false, message: error.message }
  await syncKundeLegacyAnsprechpartnerFeld(kid)
  revalidatePath(`/kunden/${kid}`)
  return { ok: true }
}

/**
 * E-Mail → bestehender Ansprechpartner (oder Kunde-Stamm-Mail).
 * Verhindert Auto-Neuer-Kunde bei zweiter Mail derselben Firma.
 */
export async function findKundeOderAnsprechpartnerByEmail(
  email: string
): Promise<
  | { ok: true; kundeId: string; ansprechpartnerId: string | null; via: 'kunde' | 'ansprechpartner' }
  | { ok: false }
> {
  const mail = email.trim().toLowerCase()
  if (!mail || !mail.includes('@')) return { ok: false }

  const { data: apRaw } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden_ansprechpartner')
      .select('id, kunde_id, email')
      .ilike('email', mail)
      .limit(1)
      .maybeSingle()
  )
  const ap = apRaw as { id: string; kunde_id: string; email: string | null } | null
  if (ap?.kunde_id) {
    return {
      ok: true,
      kundeId: String(ap.kunde_id),
      ansprechpartnerId: String(ap.id),
      via: 'ansprechpartner',
    }
  }

  const { data: kundeRaw } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('id, email').ilike('email', mail).limit(1).maybeSingle()
  )
  const kunde = kundeRaw as { id: string; email: string | null } | null
  if (kunde?.id) {
    return {
      ok: true,
      kundeId: String(kunde.id),
      ansprechpartnerId: null,
      via: 'kunde',
    }
  }

  return { ok: false }
}

/**
 * Ansprechpartner an bestehendem Kunden anlegen (z. B. statt createKundeQuick).
 * Wenn E-Mail schon existiert → bestehenden Treffer zurückgeben.
 */
export async function addAnsprechpartnerToKunde(input: {
  kundeId: string
  name: string
  email?: string | null
  telefon?: string | null
  rolle?: string | null
}): Promise<
  | { ok: true; id: string; kundeId: string; created: boolean }
  | { ok: false; message: string }
> {
  const email = input.email?.trim() || null
  if (email) {
    const hit = await findKundeOderAnsprechpartnerByEmail(email)
    if (hit.ok) {
      if (hit.ansprechpartnerId) {
        return {
          ok: true,
          id: hit.ansprechpartnerId,
          kundeId: hit.kundeId,
          created: false,
        }
      }
      // Stamm-Mail des Kunden — kein neuer AP nötig
      if (hit.kundeId === input.kundeId.trim()) {
        return { ok: true, id: '', kundeId: hit.kundeId, created: false }
      }
    }
  }

  const saved = await saveKundenAnsprechpartner(input.kundeId, {
    name: input.name,
    email,
    telefon: input.telefon,
    rolle: input.rolle,
  })
  if (!saved.ok) return saved
  return { ok: true, id: saved.id, kundeId: input.kundeId.trim(), created: true }
}

/** Vorschläge: Kunden mit ähnlichem Namen / gleicher Domain (Merge-Assistent). */
export async function listKundenDuplikatVorschlaege(limit = 40): Promise<
  Array<{
    a: { id: string; name: string; email: string | null; telefon: string | null }
    b: { id: string; name: string; email: string | null; telefon: string | null }
    grund: string
  }>
> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .select('id, name, vorname, nachname, email, telefon')
      .order('created_at', { ascending: false })
      .limit(400)
  )
  if (error || !data?.length) return []

  type Row = {
    id: string
    name: string | null
    vorname: string | null
    nachname: string | null
    email: string | null
    telefon: string | null
  }
  const rows = data as Row[]

  function display(r: Row) {
    const n =
      [r.vorname, r.nachname].filter(Boolean).join(' ').trim() ||
      r.name?.trim() ||
      'Ohne Namen'
    return {
      id: r.id,
      name: n,
      email: r.email,
      telefon: r.telefon,
    }
  }

  function domain(email: string | null) {
    const m = email?.trim().toLowerCase().split('@')[1]
    return m && m.length > 2 ? m : null
  }

  function normTel(t: string | null) {
    return (t ?? '').replace(/\D/g, '')
  }

  const out: Array<{
    a: ReturnType<typeof display>
    b: ReturnType<typeof display>
    grund: string
  }> = []
  const seen = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const A = rows[i]!
      const B = rows[j]!
      const key = [A.id, B.id].sort().join('|')
      if (seen.has(key)) continue

      const emailA = A.email?.trim().toLowerCase() || ''
      const emailB = B.email?.trim().toLowerCase() || ''
      const telA = normTel(A.telefon)
      const telB = normTel(B.telefon)
      const domA = domain(A.email)
      const domB = domain(B.email)
      const nameA = display(A).name.toLowerCase()
      const nameB = display(B).name.toLowerCase()

      let grund: string | null = null
      if (emailA && emailB && emailA === emailB) grund = 'Gleiche E-Mail'
      else if (telA.length >= 6 && telA === telB) grund = 'Gleiches Telefon'
      else if (
        domA &&
        domB &&
        domA === domB &&
        !['gmail.com', 'gmx.de', 'web.de', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.com'].includes(
          domA
        ) &&
        (nameA.includes(nameB.slice(0, 4)) || nameB.includes(nameA.slice(0, 4)))
      ) {
        grund = `Gleiche Domain (@${domA})`
      } else if (
        nameA.length >= 4 &&
        nameB.length >= 4 &&
        (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA))
      ) {
        grund = 'Ähnlicher Name'
      }

      if (!grund) continue
      seen.add(key)
      out.push({ a: display(A), b: display(B), grund })
      if (out.length >= limit) return out
    }
  }
  return out
}
