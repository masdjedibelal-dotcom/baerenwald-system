import { upsertKiAnalyse } from './upsert.mjs'
import { loadKiAnalyseDaten, quellenHinweis } from './daten-quellen.mjs'

const KI_MIN_JOBS = 2
const SCORE_WARNUNG = 3.0

export const HANDWERKER_KEY = 'ranking_gewerk'
export const HANDWERKER_BEREICH = 'handwerker'

function margeToScore(margeProzent) {
  if (margeProzent <= 0) return 2.5
  return Math.min(5, Math.max(1, margeProzent / 5))
}

function hoursBetween(from, to) {
  if (!from || !to) return null
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return (b - a) / 3_600_000
}

function isAngenommen(status) {
  const s = String(status ?? '').toLowerCase()
  return /akzept|angenom|zugew|in_arbeit|erledigt|abgeschlossen/.test(s)
}

function isAbgelehnt(status) {
  const s = String(status ?? '').toLowerCase()
  return /abgelehnt|ablehn/.test(s)
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSaveHandwerkerRanking(supabase, helpers) {
  const { num, plzRegion } = helpers

  const [{ data: handwerker }, { data: zuweisungen }, { blocks, quellen }] = await Promise.all([
    supabase
      .from('handwerker')
      .select(
        'id, name, firma, bewertung_gesamt, bewertung_termintreue, bewertung_anzahl, aktiv'
      ),
    supabase
      .from('angebot_handwerker')
      .select('handwerker_id, status, gesendet_at, antwort_at, gewerke ( name )'),
    loadKiAnalyseDaten(supabase, { num, plzRegion }),
  ])

  const hwMap = new Map((handwerker ?? []).map((h) => [h.id, h]))

  /** @type {Map<string, { handwerker_id: string, gewerk: string, jobs: number, vk: number, ek: number, antwort_stunden: number[], angenommen: number, entschieden: number }>} */
  const buckets = new Map()

  function bucket(hwId, gewerk) {
    const g = (gewerk || 'Sonstiges').trim() || 'Sonstiges'
    const key = `${hwId}::${g}`
    if (!buckets.has(key)) {
      buckets.set(key, {
        handwerker_id: hwId,
        gewerk: g,
        jobs: 0,
        vk: 0,
        ek: 0,
        antwort_stunden: [],
        angenommen: 0,
        entschieden: 0,
      })
    }
    return buckets.get(key)
  }

  const auftragBlocks = blocks.filter((b) => b.quelle === 'auftrag')
  const positionBlocks = auftragBlocks.length ? auftragBlocks : blocks

  for (const block of positionBlocks) {
    for (const p of block.positionen) {
      if (!p.handwerker_id) continue
      const b = bucket(p.handwerker_id, block.gewerk)
      b.jobs += 1
      const lineVk =
        num(p.preis_fix) ||
        (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
      const lineEk =
        num(p.preis_partner) ||
        (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
      b.vk += lineVk
      b.ek += lineEk
    }
  }

  for (const z of zuweisungen ?? []) {
    if (!z.handwerker_id) continue
    const gRaw = z.gewerke
    const g = (
      Array.isArray(gRaw) ? gRaw[0]?.name : gRaw?.name
    ) ?? 'Sonstiges'
    const b = bucket(z.handwerker_id, g)
    const h = hoursBetween(z.gesendet_at, z.antwort_at)
    if (h != null) b.antwort_stunden.push(h)
    if (isAngenommen(z.status) || isAbgelehnt(z.status)) {
      b.entschieden += 1
      if (isAngenommen(z.status)) b.angenommen += 1
    }
  }

  /** @type {{ handwerker_id: string, handwerker_name: string, gewerk: string, auftraege: number, score: number, bewertung: number | null, marge_prozent: number | null, antwort_stunden: number | null, annahme_prozent: number | null, warnung: boolean, verlaesslich: boolean }[]} */
  const zeilen = []

  for (const b of buckets.values()) {
    const hw = hwMap.get(b.handwerker_id)
    if (!hw) continue

    const bewertung = num(hw.bewertung_gesamt) || null
    const termintreue = num(hw.bewertung_termintreue) || bewertung || 3
    const margeProzent = b.vk > 0 ? ((b.vk - b.ek) / b.vk) * 100 : null
    const margeScore = margeProzent != null ? margeToScore(margeProzent) : 3

    const bewComponent = (bewertung ?? 3) * 0.4
    const termComponent = termintreue * 0.3
    const margeComponent = margeScore * 0.3
    const score = Math.round((bewComponent + termComponent + margeComponent) * 100) / 100

    const antwort =
      b.antwort_stunden.length > 0
        ? Math.round(
            (b.antwort_stunden.reduce((s, v) => s + v, 0) / b.antwort_stunden.length) * 10
          ) / 10
        : null

    const annahme =
      b.entschieden > 0 ? Math.round((b.angenommen / b.entschieden) * 100) : null

    const auftraege = Math.max(b.jobs, b.entschieden > 0 ? 1 : 0)

    zeilen.push({
      handwerker_id: b.handwerker_id,
      handwerker_name: hw.firma?.trim() || hw.name || '—',
      gewerk: b.gewerk,
      auftraege,
      score,
      bewertung: bewertung ? Math.round(bewertung * 100) / 100 : null,
      marge_prozent: margeProzent != null ? Math.round(margeProzent * 10) / 10 : null,
      antwort_stunden: antwort,
      annahme_prozent: annahme,
      warnung: score < SCORE_WARNUNG,
      verlaesslich: auftraege >= KI_MIN_JOBS,
    })
  }

  zeilen.sort((a, b) => b.score - a.score || b.auftraege - a.auftraege)

  const sampleSize = zeilen.reduce((s, z) => s + z.auftraege, 0)
  const warnungen = zeilen.filter((z) => z.warnung && z.verlaesslich).length

  let hinweis = `${quellenHinweis(quellen)} Ranking aus ${zeilen.length} Handwerker-Gewerk-Kombinationen.`
  hinweis += auftragBlocks.length
    ? ' Positionsdaten aus echten Aufträgen.'
    : ' Noch keine Auftragspositionen — Fallback auf Angebots-Positionen.'
  hinweis += ` Score = Bewertung 40 % + Termintreue 30 % + Marge 30 %.`
  if (warnungen > 0) {
    hinweis += ` ${warnungen} Kombination(en) unter Score ${SCORE_WARNUNG}.`
  }

  const topJeGewerk = []
  const seenGewerk = new Set()
  for (const z of zeilen) {
    if (!z.verlaesslich) continue
    if (seenGewerk.has(z.gewerk)) continue
    seenGewerk.add(z.gewerk)
    topJeGewerk.push({
      gewerk: z.gewerk,
      handwerker: z.handwerker_name,
      score: z.score,
    })
    if (topJeGewerk.length >= 5) break
  }

  return upsertKiAnalyse(supabase, {
    bereich: HANDWERKER_BEREICH,
    analyse_key: HANDWERKER_KEY,
    titel: 'Handwerker-Ranking je Gewerk',
    sample_size: sampleSize,
    ergebnis: {
      schwellwert: KI_MIN_JOBS,
      score_warnung: SCORE_WARNUNG,
      hinweis,
      quellen,
      top_je_gewerk: topJeGewerk,
      zeilen,
    },
  })
}
