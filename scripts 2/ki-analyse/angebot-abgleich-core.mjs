import { upsertKiAnalyse } from './upsert.mjs'
import {
  norm,
  inc,
  topN,
  parseFunnelDaten,
  rechnerLeistungenAusFunnel,
  rechnerGewerkeAusFunnel,
  parseAngebotPositionenNames,
} from './funnel-parse.mjs'

export const ANGEBOT_ABGLEICH_KEY = 'anfrage_angebot'
export const ANGEBOT_ABGLEICH_BEREICH = 'angebot_abgleich'

function setDiff(a, b) {
  const bs = new Set(b.map((x) => norm(x).toLowerCase()).filter(Boolean))
  const kept = []
  const removed = []
  for (const x of a) {
    const n = norm(x)
    if (!n) continue
    if (bs.has(n.toLowerCase())) kept.push(n)
    else removed.push(n)
  }
  const added = b.filter((x) => {
    const n = norm(x)
    return n && !a.some((y) => norm(y).toLowerCase() === n.toLowerCase())
  })
  return { kept, added, removed }
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number }} helpers */
export async function computeAndSaveAngebotAbgleich(supabase, helpers) {
  const { num } = helpers

  const [{ data: gewerke }, { data: leads }, { data: angebote }] = await Promise.all([
    supabase.from('gewerke').select('id, name, slug'),
    supabase
      .from('leads')
      .select('id, plz, bereiche, budget_ca, funnel_daten, status')
      .not('status', 'eq', 'abgebrochen'),
    supabase
      .from('angebote')
      .select('id, lead_id, status_einfach, status, gesamt_fix, gesamt_min, gesamt_max, positionen, created_at')
      .order('created_at', { ascending: false }),
  ])

  const gewerkeMap = new Map((gewerke ?? []).map((g) => [String(g.id), norm(g.name) || norm(g.slug)]))
  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]))
  const angebotRows = angebote ?? []

  const angeboteByLead = new Map()
  for (const a of angebotRows) {
    if (!a.lead_id) continue
    const list = angeboteByLead.get(a.lead_id) ?? []
    list.push(a)
    angeboteByLead.set(a.lead_id, list)
  }

  const gewerkAdded = new Map()
  const gewerkRemoved = new Map()
  const leistungAdded = new Map()
  const leistungRemoved = new Map()
  const preisAbweichungen = []

  let verglichen = 0
  let mitPositionen = 0

  for (const [leadId, leadAngebote] of angeboteByLead) {
    const lead = leadMap.get(leadId)
    if (!lead) continue

    const angebot = leadAngebote[0]
    const rawPos = Array.isArray(angebot.positionen) ? angebot.positionen : []
    if (!rawPos.length) continue

    mitPositionen += 1
    verglichen += 1

    const fd = parseFunnelDaten(lead.funnel_daten)
    const bereiche = Array.isArray(lead.bereiche) ? lead.bereiche : []
    const anfrageGewerke = rechnerGewerkeAusFunnel(fd, bereiche)
    const anfrageLeistungen = rechnerLeistungenAusFunnel(fd)

    const { leistungen: angebotLeistungen, gewerke: angebotGewerke } = parseAngebotPositionenNames(
      rawPos,
      gewerkeMap,
      num
    )

    const gDiff = setDiff(anfrageGewerke, angebotGewerke)
    const lDiff = setDiff(anfrageLeistungen, angebotLeistungen)

    for (const g of gDiff.added) inc(gewerkAdded, g)
    for (const g of gDiff.removed) inc(gewerkRemoved, g)
    for (const l of lDiff.added) inc(leistungAdded, l)
    for (const l of lDiff.removed) inc(leistungRemoved, l)

    const budget = num(lead.budget_ca)
    const vk =
      num(angebot.gesamt_fix) || num(angebot.gesamt_min) || num(angebot.gesamt_max)
    if (budget > 0 && vk > 0) {
      preisAbweichungen.push({
        budget,
        angebot: vk,
        delta_prozent: Math.round(((vk - budget) / budget) * 1000) / 10,
      })
    }
  }

  const leadsGesamt = leadMap.size
  const leadsMitAngebot = angeboteByLead.size

  const preisStats =
    preisAbweichungen.length > 0
      ? {
          anzahl: preisAbweichungen.length,
          median_delta_prozent: medianDelta(preisAbweichungen),
          ueber_budget: preisAbweichungen.filter((p) => p.delta_prozent > 5).length,
          unter_budget: preisAbweichungen.filter((p) => p.delta_prozent < -5).length,
        }
      : null

  const ergebnis = {
    hinweis: `Abgleich über lead_id → angebote.lead_id. ${verglichen} Leads mit vergleichbaren Angebots-Positionen.`,
    funnel: {
      leads_gesamt: leadsGesamt,
      leads_mit_angebot: leadsMitAngebot,
      angebote_gesamt: angebotRows.length,
      conversion_prozent:
        leadsGesamt > 0 ? Math.round((leadsMitAngebot / leadsGesamt) * 1000) / 10 : null,
    },
    abweichungen: {
      gewerke_hinzugefuegt: topN(gewerkAdded, 10),
      gewerke_entfernt: topN(gewerkRemoved, 10),
      leistungen_hinzugefuegt: topN(leistungAdded, 12),
      leistungen_entfernt: topN(leistungRemoved, 12),
    },
    preis_abgleich: preisStats,
    verglichen,
    mit_angebotspositionen: mitPositionen,
  }

  return upsertKiAnalyse(supabase, {
    bereich: ANGEBOT_ABGLEICH_BEREICH,
    analyse_key: ANGEBOT_ABGLEICH_KEY,
    titel: 'Anfrage → Angebot',
    sample_size: verglichen,
    ergebnis,
  })
}

function medianDelta(rows) {
  const vals = rows.map((r) => r.delta_prozent).sort((a, b) => a - b)
  if (!vals.length) return null
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid]
}
