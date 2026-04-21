'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { saveCustomValue as persistCustomFieldValue } from '@/lib/custom-fields'
import type { Kunde } from '@/lib/types'

export type SaveKundeInput = {
  name: string
  typ: string
  telefon?: string | null
  email?: string | null
  plz?: string | null
  ort?: string | null
  adresse?: string | null
  webseite?: string | null
  ansprechpartner?: string | null
  geburtstag?: string | null
  quelle?: string | null
  notizen?: string | null
}

function sanitizeKundePayload(input: SaveKundeInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    typ: input.typ,
    telefon: input.telefon?.trim() || null,
    email: input.email?.trim() || null,
    plz: input.plz?.trim() || null,
    ort: input.ort?.trim() || null,
    adresse: input.adresse?.trim() || null,
    webseite: input.webseite?.trim() || null,
    ansprechpartner: input.ansprechpartner?.trim() || null,
    geburtstag: input.geburtstag?.trim() || null,
    quelle: input.quelle?.trim() || null,
    notizen: input.notizen?.trim() || null,
    updated_at: new Date().toISOString(),
  }
}

export async function saveKunde(
  data: SaveKundeInput,
  kundeId?: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const payload = sanitizeKundePayload(data)

  if (kundeId) {
    const { error } = await supabase.from('kunden').update(payload).eq('id', kundeId)
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kunden')
    revalidatePath(`/kunden/${kundeId}`)
    return { ok: true, id: kundeId }
  }

  const { data: row, error } = await supabase.from('kunden').insert(payload).select('id').single()
  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  const id = row.id as string
  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
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

  await supabase
    .from('kunden')
    .update({ letzte_aktivitaet: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', kundeId)

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

  const { error: uErr } = await supabase
    .from('kunden')
    .update({ gesamt_umsatz: summe, updated_at: new Date().toISOString() })
    .eq('id', kundeId)

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
  email: string | null
): Promise<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>[]> {
  const supabase = createClient()
  const tel = telefon?.trim()
  const em = email?.trim()
  if ((!tel || tel.length < 4) && (!em || em.length < 4)) return []

  const byId = new Map<string, Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>>()

  if (em && em.length >= 4) {
    const { data, error } = await supabase
      .from('kunden')
      .select('id, name, telefon, email')
      .ilike('email', `%${em}%`)
      .limit(8)
    if (error) console.warn('findKundenDuplikate email', error.message)
    for (const r of data ?? []) byId.set(r.id as string, r as Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>)
  }

  if (tel && tel.replace(/\s/g, '').length >= 6) {
    const digits = tel.replace(/\s/g, '')
    const { data, error } = await supabase
      .from('kunden')
      .select('id, name, telefon, email')
      .ilike('telefon', `%${digits}%`)
      .limit(8)
    if (error) console.warn('findKundenDuplikate tel', error.message)
    for (const r of data ?? []) byId.set(r.id as string, r as Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>)
  }

  return Array.from(byId.values())
}
