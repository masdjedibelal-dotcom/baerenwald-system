import { upsertKiAnalyse } from './upsert.mjs'
import { loadKiAnalyseDaten, quellenHinweis } from './daten-quellen.mjs'

const KI_MIN_PAKET = 2
const KI_MIN_VERLAESSLICH = 3
const PHASE_ORDER = ['Planung', 'Vorbereitung', 'Ausführung', 'Abnahme', 'Rechnung']

export const PRODUKTE_KEY = 'pakete_leistungen'
export const PRODUKTE_BEREICH = 'produkte'

function phaseKey(raw) {
  const p = String(raw ?? '').trim()
  return p || 'Ausführung'
}

function normName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function blockSignature(leistungen) {
  return [...leistungen].sort((a, b) => a.localeCompare(b, 'de')).join('|')
}

function buildAblaufText(positionen) {
  const byPhase = new Map()
  for (const p of positionen) {
    const ph = phaseKey(p.projekt_phase)
    if (!byPhase.has(ph)) byPhase.set(ph, [])
    byPhase.get(ph).push(p)
  }

  const steps = []
  let n = 1
  const order = [...PHASE_ORDER, ...[...byPhase.keys()].filter((k) => !PHASE_ORDER.includes(k))]

  for (const ph of order) {
    const items = byPhase.get(ph)
    if (!items?.length) continue
    items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const names = items.map((p) => normName(p.leistung_name)).filter(Boolean)
    if (!names.length) continue
    steps.push(`${n}. ${ph}: ${names.join(', ')}`)
    n += 1
  }

  if (!steps.length) {
    const sorted = [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const names = sorted.map((p) => normName(p.leistung_name)).filter(Boolean)
    if (names.length) return names.map((name, i) => `${i + 1}. ${name}`).join('\n')
  }

  return steps.join('\n')
}

function buildKoordinationHinweis(positionen) {
  const fremd = positionen.filter((p) => p.handwerker_id)
  const eigen = positionen.filter((p) => !p.handwerker_id)
  const parts = []
  if (fremd.length) parts.push(`${fremd.length} Fremdleistung(en) — Handwerker zuweisen`)
  if (eigen.length) parts.push(`${eigen.length} Eigenleistung(en) — intern koordinieren`)
  return parts.join(' · ') || 'Koordination nach Gewerk prüfen'
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, median: (v: number[]) => number, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSaveProduktePakete(supabase, helpers) {
  const { num, median, plzRegion } = helpers
  const { blocks, quellen } = await loadKiAnalyseDaten(supabase, { num, plzRegion })

  if (!blocks.length) {
    return upsertKiAnalyse(supabase, {
      bereich: PRODUKTE_BEREICH,
      analyse_key: PRODUKTE_KEY,
      titel: 'Standardpakete & Leistungs-Kombinationen',
      sample_size: 0,
      ergebnis: { schwellwert: KI_MIN_PAKET, hinweis: 'Noch keine Daten.', quellen, zeilen: [] },
    })
  }

  /** @type {Map<string, typeof blocks>} */
  const byGewerk = new Map()
  for (const block of blocks) {
    const list = byGewerk.get(block.gewerk) ?? []
    list.push(block)
    byGewerk.set(block.gewerk, list)
  }

  const zeilen = []

  for (const [gewerk, gewerkBlocks] of byGewerk) {
    const paketMap = new Map()
    const coOccur = new Map()

    for (const block of gewerkBlocks) {
      const names = block.positionen.map((p) => normName(p.leistung_name)).filter(Boolean)
      if (!names.length) continue

      const sig = blockSignature(names)
      const vk = block.positionen.reduce((s, p) => {
        const line =
          num(p.preis_fix) ||
          (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
        return s + line
      }, 0) || block.gesamt_fix || 0

      const entry = paketMap.get(sig) ?? { count: 0, vk: [], positionen: block.positionen, quellen: new Set() }
      entry.count += 1
      entry.quellen.add(block.quelle)
      if (vk > 0) entry.vk.push(vk)
      paketMap.set(sig, entry)

      const unique = [...new Set(names)]
      for (const a of unique) {
        if (!coOccur.has(a)) coOccur.set(a, new Map())
        const mates = coOccur.get(a)
        for (const b of unique) {
          if (a === b) continue
          mates.set(b, (mates.get(b) ?? 0) + 1)
        }
      }
    }

    const bloeckeCount = gewerkBlocks.length
    const pakete = [...paketMap.entries()]
      .map(([sig, data]) => {
        const leistungen = sig.split('|')
        const anteil = bloeckeCount > 0 ? (data.count / bloeckeCount) * 100 : 0
        return {
          name: `${gewerk} — ${leistungen.length} Leistungen`,
          leistungen,
          haeufigkeit: data.count,
          anteil_prozent: Math.round(anteil * 10) / 10,
          vk_median: data.vk.length ? Math.round(median(data.vk)) : null,
          angebot_ablauf: buildAblaufText(data.positionen),
          koordination: buildKoordinationHinweis(data.positionen),
          quellen: [...data.quellen].join(' + '),
          verlaesslich: data.count >= KI_MIN_VERLAESSLICH,
        }
      })
      .filter((p) => p.haeufigkeit >= KI_MIN_PAKET)
      .sort((a, b) => b.haeufigkeit - a.haeufigkeit)
      .slice(0, 5)

    const kombinationen = []
    for (const [leistung, mates] of coOccur) {
      const top = [...mates.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([mit, count]) => ({ leistung: mit, zusammen: count }))
      if (!top.length || top[0].zusammen < KI_MIN_PAKET) continue
      kombinationen.push({ leistung, typisch_mit: top })
    }
    kombinationen.sort((a, b) => b.typisch_mit[0].zusammen - a.typisch_mit[0].zusammen)
    kombinationen.splice(6)

    const topPaket = pakete[0]
    const ausAngeboten = gewerkBlocks.filter((b) => b.quelle === 'angebot').length

    zeilen.push({
      gewerk,
      auftraege: bloeckeCount,
      aus_angeboten: ausAngeboten,
      standardpakete: pakete,
      kombinationen,
      angebot_ablauf_vorschlag: topPaket?.angebot_ablauf ?? '',
      koordination_vorschlag: topPaket?.koordination ?? '',
      festpreis_hinweis: topPaket?.vk_median
        ? `Häufigstes Paket: ca. ${topPaket.vk_median.toLocaleString('de-DE')} € (Median, ${topPaket.haeufigkeit}×)`
        : null,
      verlaesslich: bloeckeCount >= KI_MIN_VERLAESSLICH,
    })
  }

  zeilen.sort((a, b) => b.auftraege - a.auftraege)

  const sampleSize = zeilen.reduce((s, z) => s + z.auftraege, 0)
  let hinweis = `${quellenHinweis(quellen)} Pakete aus wiederkehrenden Leistungs-Kombinationen in Angeboten und Aufträgen.`

  return upsertKiAnalyse(supabase, {
    bereich: PRODUKTE_BEREICH,
    analyse_key: PRODUKTE_KEY,
    titel: 'Standardpakete & Leistungs-Kombinationen',
    sample_size: sampleSize,
    ergebnis: {
      schwellwert: KI_MIN_PAKET,
      hinweis,
      quellen,
      zeilen,
    },
  })
}
