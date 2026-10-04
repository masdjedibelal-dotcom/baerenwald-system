'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { KatalogPosition,KatalogVariante } from '@/lib/katalog/katalog-types'
import type { Preisliste } from '@/lib/types'
import { obergewerkFuer } from '@/lib/gewerke/obergewerk'
import { preislisteEinheitspreisNetto } from '@/lib/angebote/angebot-positionen-from-lead'

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

/** Präfix für Einträge aus „Bisher verwendet“ — keine echte Katalog-ID, wird als freie Position übernommen. */
const VERLAUF_ID_PREFIX = 'verlauf:'

/**
 * Alle gespeicherten Positionen (04.10.2026): aus Angeboten, Aufträgen und der alten Preisliste —
 * je Name die zuletzt benutzte mit Einzelpreis. Eine Quelle für Auswahl und Einstellungen → Preisliste.
 * Schreibt nichts in Katalog/Preisliste (kein Wildwuchs).
 */
export async function listVerwendetePositionen(): Promise<KatalogPosition[]> {
  const supabase = createClient()
  const [aufRes, angRes, katRes, plRes, gwRes] = await Promise.all([
    supabase
      .from('auftrag_positionen')
      .select('leistung_name, einheit, menge, preis_fix, gewerk_slug, gewerk_name, typ, created_at')
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase
      .from('angebote')
      .select('positionen, created_at')
      .order('created_at', { ascending: false })
      .limit(400),
    supabase.from('katalog_positionen').select('titel').eq('aktiv', true),
    // Alte Preisliste gehört mit in die eine Liste
    supabase.from('preislisten').select('*, gewerke(name)').eq('aktiv', true),
    supabase.from('gewerke').select('id, slug, name').eq('aktiv', true),
  ])
  // Gewerk über ID/Slug auflösen — Verweise zeigen seit der Zusammenlegung auf die 11 Obergewerke
  const gewerkName = new Map<string, string>()
  for (const g of gwRes.data ?? []) {
    const name = String(g.name ?? '').trim()
    gewerkName.set(String(g.id), name)
    if (g.slug) gewerkName.set(String(g.slug), name)
  }
  const gewerkVon = (key: unknown, fallback: unknown) =>
    gewerkName.get(String(key ?? '')) || obergewerkFuer(String(fallback ?? '') || String(key ?? ''))
  if (plRes.error) logDbError('app/katalog/actions:verlauf-preisliste', plRes.error)
  if (aufRes.error) logDbError('app/katalog/actions:verlauf-auftrag', aufRes.error)
  if (angRes.error) logDbError('app/katalog/actions:verlauf-angebote', angRes.error)

  type Treffer = { name: string; einheit: string; preis: number; gewerk: string; at: string }
  const kandidaten: Treffer[] = []
  for (const r of aufRes.data ?? []) {
    const name = String(r.leistung_name ?? '').trim()
    const menge = Number(r.menge) > 0 ? Number(r.menge) : 1
    if (!name || r.typ === 'regie') continue
    kandidaten.push({
      name,
      einheit: String(r.einheit ?? '').trim() || 'Stück',
      preis: Math.round(((Number(r.preis_fix) || 0) / menge) * 100) / 100,
      gewerk: gewerkVon(r.gewerk_slug, r.gewerk_name),
      at: String(r.created_at ?? ''),
    })
  }
  for (const a of angRes.data ?? []) {
    const list = Array.isArray(a.positionen) ? (a.positionen as Record<string, unknown>[]) : []
    for (const p of list) {
      const name = String(p.leistung ?? '').trim()
      const kind = String(p.kind ?? p.typ ?? '')
      if (!name || kind === 'freitext' || kind === 'nachlass') continue
      kandidaten.push({
        name,
        einheit: String(p.einheit ?? '').trim() || 'Stück',
        preis: Math.round((Number(p.vk_netto) || 0) * 100) / 100,
        gewerk: gewerkVon(p.gewerk_id || p.gewerk_slug, p.gewerk_name),
        at: String(a.created_at ?? ''),
      })
    }
  }
  for (const r of plRes.data ?? []) {
    const pl = r as unknown as Preisliste & { gewerke?: { name?: string | null } | null; updated_at?: string | null; created_at?: string | null }
    const name = String(pl.leistung ?? '').trim()
    if (!name) continue
    kandidaten.push({
      name,
      einheit: String(pl.einheit ?? '').trim() || 'Stück',
      preis: Math.round(preislisteEinheitspreisNetto(pl) * 100) / 100,
      gewerk: gewerkVon(pl.gewerk_id, pl.gewerke?.name),
      // Ohne Datum gilt ein Preislisten-Eintrag als älter als jede echte Verwendung
      at: String(pl.updated_at ?? pl.created_at ?? ''),
    })
  }
  const imKatalog = new Set((katRes.data ?? []).map((k) => String(k.titel ?? '').trim().toLowerCase()))
  const neueste = new Map<string, Treffer>()
  for (const k of kandidaten) {
    const key = k.name.toLowerCase()
    if (imKatalog.has(key) || /^__|^abschlag\b|^gesamtrabatt|^nachlass/i.test(k.name)) continue
    const alt = neueste.get(key)
    if (!alt || k.at > alt.at) neueste.set(key, k)
  }
  return Array.from(neueste.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((t, i) => {
      const id = `${VERLAUF_ID_PREFIX}${i}`
      return {
        id,
        gewerk_id: `${VERLAUF_ID_PREFIX}${t.gewerk.toLowerCase()}`,
        titel: t.name,
        kategorie: 'Bisher verwendet',
        beschreibung_standard: '',
        aktiv: true,
        sortierung: 9999,
        gewerk_name: t.gewerk,
        gewerk_slug: null,
        varianten: [
          {
            id,
            position_id: id,
            variante: '',
            beschreibung: '',
            einheit: t.einheit,
            preis_typ: 'fix',
            preis: t.preis,
            aktiv: true,
            sortierung: 0,
          },
        ],
      }
    })
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
  if (error) logDbError('app/katalog/actions:katalog_lernsignale', error)
  if (error && !/katalog_lernsignale|does not exist/i.test(error.message)) {
    console.warn('[recordKatalogLernsignale]', error.message)
  }
}
