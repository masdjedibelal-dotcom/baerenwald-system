'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { KatalogPosition, KatalogVariante } from '@/lib/katalog/katalog-types'

function mapVariante(r: Record<string, unknown>): KatalogVariante {
  return {
    id: String(r.id),
    position_id: String(r.position_id),
    variante: String(r.variante ?? ''),
    beschreibung: String(r.beschreibung ?? ''),
    einheit: String(r.einheit ?? 'pauschal'),
    preis_typ: String(r.preis_typ ?? 'ab'),
    preis: Number(r.preis) || 0,
    aktiv: r.aktiv !== false,
    sortierung: Number(r.sortierung) || 0,
  }
}

/** Lädt aktiven Katalog. Leer-Array wenn Tabellen noch fehlen (vor Import). */
export async function listKatalogPositionen(opts?: {
  nurAktiv?: boolean
  gewerkId?: string | null
}): Promise<KatalogPosition[]> {
  const nurAktiv = opts?.nurAktiv !== false
  const supabase = createClient()

  let q = supabase
    .from('katalog_positionen')
    .select(
      `
      id, gewerk_id, titel, kategorie, beschreibung_standard, aktiv, sortierung,
      gewerke(id, name, slug),
      katalog_varianten(id, position_id, variante, beschreibung, einheit, preis_typ, preis, aktiv, sortierung)
    `
    )
    .order('sortierung', { ascending: true })
    .order('titel', { ascending: true })

  if (nurAktiv) q = q.eq('aktiv', true)
  if (opts?.gewerkId) q = q.eq('gewerk_id', opts.gewerkId)

  const { data, error } = await q
  if (error) {
    if (/katalog_positionen|does not exist|schema cache/i.test(error.message)) {
      return []
    }
    console.error('[listKatalogPositionen]', error.message)
    return []
  }

  const out: KatalogPosition[] = []
  for (const row of data ?? []) {
    const gwRaw = row.gewerke
    const gw = Array.isArray(gwRaw) ? gwRaw[0] : gwRaw
    let vars = Array.isArray(row.katalog_varianten)
      ? row.katalog_varianten.map((v) => mapVariante(v as Record<string, unknown>))
      : []
    if (nurAktiv) vars = vars.filter((v) => v.aktiv)
    vars.sort((a, b) => a.sortierung - b.sortierung || a.variante.localeCompare(b.variante, 'de'))
    out.push({
      id: String(row.id),
      gewerk_id: String(row.gewerk_id),
      titel: String(row.titel),
      kategorie: String(row.kategorie ?? 'Sonstiges'),
      beschreibung_standard: String(row.beschreibung_standard ?? ''),
      aktiv: row.aktiv !== false,
      sortierung: Number(row.sortierung) || 0,
      gewerk_name: gw?.name ?? null,
      gewerk_slug: gw?.slug ?? null,
      varianten: vars,
    })
  }
  return out
}

export async function updateKatalogVariantePreis(
  varianteId: string,
  preis: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('katalog_varianten')
    .update({ preis: Math.max(0, Math.round(preis * 100) / 100) })
    .eq('id', varianteId)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function setKatalogVarianteAktiv(
  varianteId: string,
  aktiv: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('katalog_varianten')
    .update({ aktiv })
    .eq('id', varianteId)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function setKatalogPositionAktiv(
  positionId: string,
  aktiv: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('katalog_positionen')
    .update({ aktiv })
    .eq('id', positionId)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** Freie Position für KI-Lernbasis speichern — kein Katalog-Insert. */
export async function recordKatalogLernsignale(
  rows: Array<{
    angebotId?: string | null
    leadId?: string | null
    gewerkId?: string | null
    titel: string
    beschreibung?: string
    einheit?: string
    preisNetto?: number
    menge?: number
    quelle?: 'frei' | 'katalog_abgewandelt'
  }>
): Promise<void> {
  const pending = rows.filter((r) => r.titel.trim())
  if (!pending.length) return

  const { error } = await supabaseAdmin.from('katalog_lernsignale').insert(
    pending.map((r) => ({
      angebot_id: r.angebotId ?? null,
      lead_id: r.leadId ?? null,
      gewerk_id: r.gewerkId ?? null,
      titel: r.titel.trim(),
      beschreibung: (r.beschreibung ?? '').trim(),
      einheit: (r.einheit || 'pauschal').trim(),
      preis_netto: Math.max(0, Number(r.preisNetto) || 0),
      menge: Math.max(0, Number(r.menge) || 1),
      quelle: r.quelle ?? 'frei',
    }))
  )
  if (error && !/katalog_lernsignale|does not exist/i.test(error.message)) {
    console.warn('[recordKatalogLernsignale]', error.message)
  }
}
