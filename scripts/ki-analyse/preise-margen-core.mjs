import { upsertKiAnalyse } from './upsert.mjs'
import { loadKiAnalyseDaten, blockVkEk, quellenHinweis } from './daten-quellen.mjs'

const KI_MIN_SAMPLE_DEFAULT = 10
const KI_MIN_SAMPLE_GEWERK = 2

export const PREISE_MARGEN_KEY = 'preisrahmen_gewerk_plz'
export const PREISE_MARGEN_BEREICH = 'preise_margen'

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, median: (v: number[]) => number, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSavePreiseMargen(supabase, helpers) {
  const { num, median, plzRegion } = helpers
  const { blocks, quellen } = await loadKiAnalyseDaten(supabase, { num, plzRegion })

  if (!blocks.length) {
    return upsertKiAnalyse(supabase, {
      bereich: PREISE_MARGEN_BEREICH,
      analyse_key: PREISE_MARGEN_KEY,
      titel: 'Preisrahmen je Gewerk & Region',
      sample_size: 0,
      ergebnis: {
        schwellwert: KI_MIN_SAMPLE_DEFAULT,
        hinweis: 'Noch keine Aufträge oder Angebote mit Positionen in Supabase.',
        region_label: '—',
        quellen,
        zeilen: [],
      },
    })
  }

  /** @type {Map<string, { gewerk: string, plz_region: string, vk: number, ek: number, status: string, quelle: string }[]>} */
  const buckets = new Map()

  for (const block of blocks) {
    const { vk, ek } = blockVkEk(block.positionen, num)
    let totalVk = vk
    if (totalVk <= 0 && block.gesamt_fix) totalVk = block.gesamt_fix
    if (totalVk <= 0) continue

    const key = `${block.gewerk}::${block.plz_region}`
    const list = buckets.get(key) ?? []
    list.push({
      gewerk: block.gewerk,
      plz_region: block.plz_region,
      vk: totalVk,
      ek,
      status: block.status,
      quelle: block.quelle,
    })
    buckets.set(key, list)
  }

  const zeilen = []
  for (const [, entries] of buckets) {
    const vkValues = entries.map((e) => e.vk)
    const totalVk = vkValues.reduce((s, v) => s + v, 0)
    const totalEk = entries.reduce((s, e) => s + e.ek, 0)
    const marge = totalVk > 0 ? ((totalVk - totalEk) / totalVk) * 100 : 0
    const first = entries[0]
    const abgeschlossen = entries.filter((e) => e.status === 'abgeschlossen' || e.status === 'angenommen').length
    const ausAngeboten = entries.filter((e) => e.quelle === 'angebot').length

    zeilen.push({
      gewerk: first.gewerk,
      plz_region: first.plz_region,
      anzahl: entries.length,
      preis_min: Math.min(...vkValues),
      preis_max: Math.max(...vkValues),
      preis_median: Math.round(median(vkValues)),
      marge_prozent: Math.round(marge * 10) / 10,
      verlaesslich: entries.length >= KI_MIN_SAMPLE_GEWERK,
      abgeschlossen,
      aus_angeboten: ausAngeboten,
    })
  }

  zeilen.sort((a, b) => b.anzahl - a.anzahl)

  const sampleSize = zeilen.reduce((s, z) => s + z.anzahl, 0)
  let hinweis = quellenHinweis(quellen)
  if (sampleSize < KI_MIN_SAMPLE_DEFAULT) {
    hinweis += ` Ab ${KI_MIN_SAMPLE_DEFAULT} Blöcken empfohlen für verlässliche Preisrahmen.`
  }

  const regionLabel =
    zeilen.length > 0 ? `Verschiedene PLZ-Regionen (${zeilen.length} Gewerk-Regionen)` : '—'

  return upsertKiAnalyse(supabase, {
    bereich: PREISE_MARGEN_BEREICH,
    analyse_key: PREISE_MARGEN_KEY,
    titel: 'Preisrahmen je Gewerk & Region',
    sample_size: sampleSize,
    ergebnis: {
      schwellwert: KI_MIN_SAMPLE_DEFAULT,
      hinweis,
      region_label: regionLabel,
      quellen,
      zeilen,
    },
  })
}
