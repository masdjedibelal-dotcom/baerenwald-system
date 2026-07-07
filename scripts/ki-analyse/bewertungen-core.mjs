import { upsertKiAnalyse } from './upsert.mjs'
import { norm } from './funnel-parse.mjs'

export const BEWERTUNGEN_KEY = 'handwerker_scores'
export const BEWERTUNGEN_BEREICH = 'bewertungen'

function avg(vals) {
  if (!vals.length) return null
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function computeAndSaveBewertungen(supabase) {
  const { data: rows, error } = await supabase
    .from('handwerker_bewertungen')
    .select(
      'handwerker_id, qualitaet, termintreue, sauberkeit, kommunikation, preis_leistung, gewerk_id, handwerker ( id, name, firma, bewertung_gesamt, bewertung_anzahl ), gewerke ( name )'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const bewertungen = rows ?? []

  if (!bewertungen.length) {
    const { data: handwerker } = await supabase
      .from('handwerker')
      .select('id, name, firma, bewertung_gesamt, bewertung_anzahl, bewertung_qualitaet, bewertung_termintreue')
      .gt('bewertung_anzahl', 0)

    const fallback = (handwerker ?? []).map((h) => ({
      handwerker_id: h.id,
      handwerker_name: h.firma?.trim() || h.name || '—',
      gewerk: '—',
      anzahl: h.bewertung_anzahl ?? 0,
      gesamt: h.bewertung_gesamt,
      qualitaet: h.bewertung_qualitaet,
      termintreue: h.bewertung_termintreue,
      sauberkeit: null,
      kommunikation: null,
      preis_leistung: null,
      quelle: 'handwerker_aggregate',
    }))

    return upsertKiAnalyse(supabase, {
      bereich: BEWERTUNGEN_BEREICH,
      analyse_key: BEWERTUNGEN_KEY,
      titel: 'Handwerker-Bewertungen',
      sample_size: fallback.reduce((s, z) => s + z.anzahl, 0),
      ergebnis: {
        hinweis:
          'Noch keine Einzelbewertungen pro Auftrag. Aggregierte Stammdaten aus handwerker, falls vorhanden. Nach Projektabschluss im CRM bewerten.',
        zeilen: fallback,
        kategorien_durchschnitt: null,
      },
    })
  }

  /** @type {Map<string, { handwerker_id: string, handwerker_name: string, gewerk: string, scores: { q: number[], t: number[], s: number[], k: number[], p: number[] } }>} */
  const buckets = new Map()

  for (const b of bewertungen) {
    const hw = b.handwerker
    const gRaw = b.gewerke
    const gewerk = (Array.isArray(gRaw) ? gRaw[0]?.name : gRaw?.name) ?? '—'
    const hwName = hw?.firma?.trim() || hw?.name || '—'
    const key = `${b.handwerker_id}::${gewerk}`
    if (!buckets.has(key)) {
      buckets.set(key, {
        handwerker_id: b.handwerker_id,
        handwerker_name: hwName,
        gewerk,
        scores: { q: [], t: [], s: [], k: [], p: [] },
      })
    }
    const bucket = buckets.get(key)
    bucket.scores.q.push(b.qualitaet)
    bucket.scores.t.push(b.termintreue)
    bucket.scores.s.push(b.sauberkeit)
    bucket.scores.k.push(b.kommunikation)
    bucket.scores.p.push(b.preis_leistung)
  }

  const zeilen = [...buckets.values()]
    .map((b) => {
      const gesamtVals = []
      for (let i = 0; i < b.scores.q.length; i++) {
        gesamtVals.push(
          (b.scores.q[i] + b.scores.t[i] + b.scores.s[i] + b.scores.k[i] + b.scores.p[i]) / 5
        )
      }
      return {
        handwerker_id: b.handwerker_id,
        handwerker_name: b.handwerker_name,
        gewerk: b.gewerk,
        anzahl: b.scores.q.length,
        gesamt: avg(gesamtVals),
        qualitaet: avg(b.scores.q),
        termintreue: avg(b.scores.t),
        sauberkeit: avg(b.scores.s),
        kommunikation: avg(b.scores.k),
        preis_leistung: avg(b.scores.p),
        quelle: 'handwerker_bewertungen',
      }
    })
    .sort((a, b) => (b.gesamt ?? 0) - (a.gesamt ?? 0) || b.anzahl - a.anzahl)

  const allQ = bewertungen.map((b) => b.qualitaet)
  const allT = bewertungen.map((b) => b.termintreue)
  const allS = bewertungen.map((b) => b.sauberkeit)
  const allK = bewertungen.map((b) => b.kommunikation)
  const allP = bewertungen.map((b) => b.preis_leistung)

  return upsertKiAnalyse(supabase, {
    bereich: BEWERTUNGEN_BEREICH,
    analyse_key: BEWERTUNGEN_KEY,
    titel: 'Handwerker-Bewertungen',
    sample_size: bewertungen.length,
    ergebnis: {
      hinweis: `${bewertungen.length} Bewertungen nach abgeschlossenen Aufträgen (5 Kategorien à 1–5).`,
      zeilen,
      kategorien_durchschnitt: {
        qualitaet: avg(allQ),
        termintreue: avg(allT),
        sauberkeit: avg(allS),
        kommunikation: avg(allK),
        preis_leistung: avg(allP),
      },
    },
  })
}
