'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { NeueLeistungSyncInput } from '@/lib/preislisten/sync-neue-leistungen'
import { toSlug } from '@/lib/utils'

/**
 * Früher: freie Leistungen → preislisten (Wildwuchs).
 * Jetzt: No-Op. Freie Positionen bleiben nur im Angebots-Snapshot;
 * Lernsignale für KI → recordKatalogLernsignale.
 */
export async function syncNeueLeistungenToPreisliste(
  inputs: NeueLeistungSyncInput[]
): Promise<{ ok: true; created: number } | { ok: false; message: string }> {
  void inputs
  return { ok: true, created: 0 }
}

export async function updatePreisliste(
  id: string,
  patch: {
    gewerk_id?: string
    kategorie?: string
    leistung?: string
    einheit?: string
    preis_min?: number
    aktiv?: boolean
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('preislisten').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/preislisten')
  revalidatePath('/einstellungen/preise')
  revalidatePath('/einstellungen/gewerke')
  return { ok: true }
}

export async function createPreisliste(input: {
  gewerk_id: string
  kategorie?: string
  leistung: string
  einheit: string
  preis_min: number
  aktiv?: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('preislisten')
    .insert({
      gewerk_id: input.gewerk_id,
      kategorie: (input.kategorie ?? '').trim(),
      leistung: input.leistung.trim(),
      einheit: input.einheit.trim(),
      preis_min: input.preis_min,
      aktiv: input.aktiv ?? true,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath('/preislisten')
  revalidatePath('/einstellungen/preise')
  revalidatePath('/einstellungen/gewerke')
  return { ok: true, id: data.id as string }
}

export async function softDeletePreisliste(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return updatePreisliste(id, { aktiv: false })
}

export async function setGewerkAktiv(
  id: string,
  aktiv: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('gewerke').update({ aktiv }).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/preislisten')
  revalidatePath('/einstellungen/preise')
  revalidatePath('/einstellungen/gewerke')
  return { ok: true }
}

export async function updateGewerk(
  id: string,
  patch: { name: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = patch.name.trim()
  if (!trimmed) return { ok: false, message: 'Name erforderlich' }
  const supabase = createClient()
  const { error } = await supabase.from('gewerke').update({ name: trimmed }).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/preislisten')
  revalidatePath('/einstellungen/preise')
  revalidatePath('/einstellungen/gewerke')
  return { ok: true }
}

export async function createGewerk(
  name: string
): Promise<{ ok: true; id: string; slug: string; name: string } | { ok: false; message: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, message: 'Name erforderlich' }

  const supabase = createClient()
  let base = toSlug(trimmed)
  if (!base) base = 'gewerk'

  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}_${i}`
    const { data: existing } = await supabase.from('gewerke').select('id').eq('slug', slug).maybeSingle()
    if (existing) continue

    const { data, error } = await supabase
      .from('gewerke')
      .insert({ name: trimmed, slug, aktiv: true })
      .select('id, slug, name')
      .single()

    if (error || !data) return { ok: false, message: error?.message ?? 'Anlegen fehlgeschlagen' }
    revalidatePath('/preislisten')
  revalidatePath('/einstellungen/preise')
    revalidatePath('/einstellungen/gewerke')
    return { ok: true, id: data.id as string, slug: data.slug as string, name: data.name as string }
  }

  return { ok: false, message: 'Kein freier Slug gefunden' }
}
