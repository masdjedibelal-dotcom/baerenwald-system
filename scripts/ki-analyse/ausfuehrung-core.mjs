import { upsertKiAnalyse } from './upsert.mjs'
import { loadKiAnalyseDaten, quellenHinweis } from './daten-quellen.mjs'
import { norm, inc, topN } from './funnel-parse.mjs'

export const AUSFUEHRUNG_KEY = 'eigen_fremd'
export const AUSFUEHRUNG_BEREICH = 'ausfuehrung'

function lineVkEk(p, num) {
  const menge = Math.max(num(p.menge), 1)
  const vk = num(p.preis_fix) || (num(p.lohn_fix) + num(p.material_fix)) * menge
  const ek = num(p.preis_partner) || (num(p.lohn_fix) + num(p.material_fix)) * menge
  return { vk, ek }
}

function margePct(vk, ek) {
  if (vk <= 0) return null
  return Math.round(((vk - ek) / vk) * 1000) / 10
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSaveAusfuehrung(supabase, helpers) {
  const { num, plzRegion } = helpers

  const [{ data: auftraege }, { blocks, quellen }] = await Promise.all([
    supabase
      .from('auftraege')
      .select('id')
      .neq('status', 'storniert'),
    loadKiAnalyseDaten(supabase, { num, plzRegion }),
  ])

  const auftragIds = (auftraege ?? []).map((a) => a.id)
  let positionen = []

  if (auftragIds.length) {
    const { data, error } = await supabase
      .from('auftrag_positionen')
      .select(
        'gewerk_name, leistung_name, handwerker_id, preis_fix, preis_partner, lohn_fix, material_fix, menge, handwerker ( id, name, firma )'
      )
      .in('auftrag_id', auftragIds)
    if (error) throw new Error(`auftrag_positionen: ${error.message}`)
    positionen = data ?? []
  }

  const quelle = positionen.length > 0 ? 'auftrag_positionen' : 'angebote_fallback'
  const rows =
    positionen.length > 0
      ? positionen.map((p) => ({
          gewerk: norm(p.gewerk_name) || 'Sonstiges',
          leistung: norm(p.leistung_name) || 'Leistung',
          handwerker_id: p.handwerker_id,
          handwerker_name: p.handwerker?.firma?.trim() || p.handwerker?.name || null,
          ...lineVkEk(p, num),
        }))
      : flattenAngebotBlocks(blocks, num)

  if (!rows.length) {
    return upsertKiAnalyse(supabase, {
      bereich: AUSFUEHRUNG_BEREICH,
      analyse_key: AUSFUEHRUNG_KEY,
      titel: 'Ausführung Eigen & Fremd',
      sample_size: 0,
      ergebnis: {
        hinweis: 'Noch keine Auftragspositionen oder Angebote mit Leistungen.',
        quelle,
        quellen,
        zusammenfassung: null,
        je_gewerk: [],
        eigen_leistungen: [],
        fremd_handwerker: [],
      },
    })
  }

  let eigenVk = 0
  let eigenEk = 0
  let eigenCount = 0
  let fremdVk = 0
  let fremdEk = 0
  let fremdCount = 0

  /** @type {Map<string, { gewerk: string, eigen: { count: number, vk: number, ek: number }, fremd: { count: number, vk: number, ek: number } }>} */
  const byGewerk = new Map()
  const eigenLeistungen = new Map()
  /** @type {Map<string, { name: string, gewerk: string, count: number, vk: number, ek: number }>} */
  const fremdHw = new Map()

  for (const row of rows) {
    const isFremd = !!row.handwerker_id
    if (isFremd) {
      fremdVk += row.vk
      fremdEk += row.ek
      fremdCount += 1
      const hwKey = row.handwerker_id || row.handwerker_name || 'Partner'
      const hwLabel = row.handwerker_name || 'Partner'
      if (!fremdHw.has(hwKey)) {
        fremdHw.set(hwKey, { name: hwLabel, gewerk: row.gewerk, count: 0, vk: 0, ek: 0 })
      }
      const h = fremdHw.get(hwKey)
      h.count += 1
      h.vk += row.vk
      h.ek += row.ek
    } else {
      eigenVk += row.vk
      eigenEk += row.ek
      eigenCount += 1
      inc(eigenLeistungen, `${row.gewerk} · ${row.leistung}`)
    }

    if (!byGewerk.has(row.gewerk)) {
      byGewerk.set(row.gewerk, {
        gewerk: row.gewerk,
        eigen: { count: 0, vk: 0, ek: 0 },
        fremd: { count: 0, vk: 0, ek: 0 },
      })
    }
    const g = byGewerk.get(row.gewerk)
    const bucket = isFremd ? g.fremd : g.eigen
    bucket.count += 1
    bucket.vk += row.vk
    bucket.ek += row.ek
  }

  const totalVk = eigenVk + fremdVk
  const jeGewerk = [...byGewerk.values()]
    .map((g) => ({
      gewerk: g.gewerk,
      eigen_positionen: g.eigen.count,
      eigen_marge_prozent: margePct(g.eigen.vk, g.eigen.ek),
      fremd_positionen: g.fremd.count,
      fremd_marge_prozent: margePct(g.fremd.vk, g.fremd.ek),
      eigen_anteil_prozent:
        g.eigen.count + g.fremd.count > 0
          ? Math.round((g.eigen.count / (g.eigen.count + g.fremd.count)) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.eigen_positionen + b.fremd_positionen - (a.eigen_positionen + a.fremd_positionen))

  const fremdHandwerker = [...fremdHw.values()]
    .map((h) => ({
      handwerker: h.name,
      leistungen: h.count,
      vk: Math.round(h.vk),
      marge_prozent: margePct(h.vk, h.ek),
    }))
    .sort((a, b) => b.leistungen - a.leistungen)
    .slice(0, 12)

  let hinweis = quellenHinweis(quellen)
  hinweis += ` Ausführung aus ${quelle === 'auftrag_positionen' ? 'echten Auftragspositionen' : 'Angebots-Fallback (noch keine Auftragspositionen)'}.`
  hinweis += ` Eigen = ohne Handwerker-Zuweisung, Fremd = mit Partner.`

  const ergebnis = {
    hinweis,
    quelle,
    quellen,
    zusammenfassung: {
      positionen_gesamt: rows.length,
      eigen_positionen: eigenCount,
      fremd_positionen: fremdCount,
      eigen_anteil_prozent: rows.length ? Math.round((eigenCount / rows.length) * 1000) / 10 : null,
      vk_gesamt: Math.round(totalVk),
      marge_eigen_prozent: margePct(eigenVk, eigenEk),
      marge_fremd_prozent: margePct(fremdVk, fremdEk),
    },
    je_gewerk: jeGewerk.slice(0, 15),
    eigen_leistungen: topN(eigenLeistungen, 12),
    fremd_handwerker: fremdHandwerker,
  }

  return upsertKiAnalyse(supabase, {
    bereich: AUSFUEHRUNG_BEREICH,
    analyse_key: AUSFUEHRUNG_KEY,
    titel: 'Ausführung Eigen & Fremd',
    sample_size: rows.length,
    ergebnis,
  })
}

function flattenAngebotBlocks(blocks, num) {
  const rows = []
  for (const block of blocks) {
    if (block.quelle !== 'angebot') continue
    for (const p of block.positionen) {
      const { vk, ek } = lineVkEk(p, num)
      if (vk <= 0) continue
      rows.push({
        gewerk: norm(block.gewerk) || 'Sonstiges',
        leistung: norm(p.leistung_name) || 'Leistung',
        handwerker_id: p.handwerker_id,
        handwerker_name: null,
        vk,
        ek,
      })
    }
  }
  return rows
}
