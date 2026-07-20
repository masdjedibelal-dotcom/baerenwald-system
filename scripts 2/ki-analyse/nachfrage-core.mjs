import { upsertKiAnalyse } from './upsert.mjs'
import { inc, topN, parseFunnelDaten, rechnerLeistungenAusFunnel } from './funnel-parse.mjs'

export const NACHFRAGE_KEY = 'plz_rechner'
export const NACHFRAGE_BEREICH = 'nachfrage'

const SITUATION_LABELS = {
  erneuern: 'Umbau & Modernisierung',
  kaputt: 'Reparatur & Notfall',
  notfall: 'Notfall',
  neubauen: 'Neu bauen / Ausbau',
  betreuung: 'Betreuung',
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, median: (v: number[]) => number, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSaveNachfrage(supabase, helpers) {
  const { num, median, plzRegion } = helpers

  const { data: leads, error } = await supabase
    .from('leads')
    .select(
      'id, plz, kanal, status, situation, bereiche, budget_ca, kundentyp, funnel_daten, created_at'
    )
    .not('status', 'eq', 'abgebrochen')

  if (error) throw new Error(error.message)

  const rows = leads ?? []
  if (!rows.length) {
    return upsertKiAnalyse(supabase, {
      bereich: NACHFRAGE_BEREICH,
      analyse_key: NACHFRAGE_KEY,
      titel: 'Nachfrage & Rechner',
      sample_size: 0,
      ergebnis: {
        hinweis: 'Noch keine Anfragen in Supabase.',
        plz_regionen: [],
        bereiche: [],
        situationen: [],
        kanaele: [],
        rechner_leistungen: [],
        budgets: null,
      },
    })
  }

  const plzMap = new Map()
  const bereicheMap = new Map()
  const situationMap = new Map()
  const kanalMap = new Map()
  const rechnerMap = new Map()
  const kundentypMap = new Map()
  const budgets = []

  let mitRechner = 0
  let mitBereichen = 0

  for (const lead of rows) {
    const region = plzRegion(lead.plz)
    inc(plzMap, region)

    const bereiche = Array.isArray(lead.bereiche) ? lead.bereiche : []
    if (bereiche.length) mitBereichen += 1
    for (const b of bereiche) inc(bereicheMap, b)

    const sitKey = String(lead.situation ?? '').trim()
    const sitLabel = (SITUATION_LABELS[sitKey] ?? sitKey) || '—'
    if (sitKey) inc(situationMap, sitLabel)

    inc(kanalMap, lead.kanal ?? 'unbekannt')
    if (lead.kundentyp) inc(kundentypMap, lead.kundentyp)

    const budget = num(lead.budget_ca)
    if (budget > 0) budgets.push(budget)

    const fd = parseFunnelDaten(lead.funnel_daten)
    const rechner = rechnerLeistungenAusFunnel(fd)
    if (rechner.length || fd.positionen || fd.was_zeilen) mitRechner += 1
    for (const name of rechner) inc(rechnerMap, name)
  }

  const ergebnis = {
    hinweis: `Auswertung über lead_id — ${rows.length} Anfragen, ${mitRechner} mit Rechner-Daten, ${mitBereichen} mit Gewerk-Bereichen.`,
    plz_regionen: topN(plzMap, 12),
    bereiche: topN(bereicheMap, 12),
    situationen: topN(situationMap, 8),
    kanaele: topN(kanalMap, 8),
    kundentypen: topN(kundentypMap, 6),
    rechner_leistungen: topN(rechnerMap, 15),
    budgets:
      budgets.length > 0
        ? {
            anzahl: budgets.length,
            median: Math.round(median(budgets)),
            min: Math.min(...budgets),
            max: Math.max(...budgets),
          }
        : null,
    anteil_mit_rechner: Math.round((mitRechner / rows.length) * 1000) / 10,
  }

  return upsertKiAnalyse(supabase, {
    bereich: NACHFRAGE_BEREICH,
    analyse_key: NACHFRAGE_KEY,
    titel: 'Nachfrage & Rechner',
    sample_size: rows.length,
    ergebnis,
  })
}
