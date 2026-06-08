import { upsertKiAnalyse } from './upsert.mjs'
import { daysBetween, median } from './lib.mjs'

export const FUNNEL_KEY = 'overview'
export const FUNNEL_BEREICH = 'funnel'

function pct(num, den) {
  if (!den) return null
  return Math.round((num / den) * 1000) / 10
}

function zyklusStat(values) {
  if (!values.length) return { anzahl: 0, median_tage: null }
  const med = median(values)
  return { anzahl: values.length, median_tage: med != null ? Math.round(med) : null }
}

function earliestByKey(rows, keyField, dateField = 'created_at') {
  const map = new Map()
  for (const row of rows) {
    const key = row[keyField]
    const date = row[dateField]
    if (!key || !date) continue
    const existing = map.get(key)
    if (!existing || date < existing) map.set(key, date)
  }
  return map
}

function computeZyklen(leadRows, angebotRows, auftragRows) {
  const leadCreated = new Map(leadRows.map((l) => [l.id, l.created_at]))
  const firstAngebotByLead = earliestByKey(angebotRows, 'lead_id')
  const firstAuftragByLead = earliestByKey(auftragRows, 'lead_id')

  const abschlussByLead = new Map()
  for (const auf of auftragRows) {
    if (auf.status !== 'abgeschlossen' || !auf.lead_id) continue
    const endDate = auf.updated_at ?? auf.created_at
    if (!endDate) continue
    const existing = abschlussByLead.get(auf.lead_id)
    if (!existing || endDate < existing) abschlussByLead.set(auf.lead_id, endDate)
  }

  const anfrageZuAngebot = []
  const anfrageZuAuftrag = []
  const anfrageZuAbschluss = []
  const angebotZuAuftrag = []

  for (const [leadId, leadAt] of leadCreated) {
    const angebotAt = firstAngebotByLead.get(leadId)
    const d1 = daysBetween(leadAt, angebotAt)
    if (d1 != null) anfrageZuAngebot.push(d1)

    const aufAt = firstAuftragByLead.get(leadId)
    const d2 = daysBetween(leadAt, aufAt)
    if (d2 != null) anfrageZuAuftrag.push(d2)

    const endAt = abschlussByLead.get(leadId)
    const d3 = daysBetween(leadAt, endAt)
    if (d3 != null) anfrageZuAbschluss.push(d3)

    if (angebotAt && aufAt) {
      const d4 = daysBetween(angebotAt, aufAt)
      if (d4 != null) angebotZuAuftrag.push(d4)
    }
  }

  return {
    anfrage_zu_angebot: zyklusStat(anfrageZuAngebot),
    angebot_zu_auftrag: zyklusStat(angebotZuAuftrag),
    anfrage_zu_auftrag: zyklusStat(anfrageZuAuftrag),
    anfrage_zu_abschluss: zyklusStat(anfrageZuAbschluss),
  }
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function computeAndSaveFunnelOverview(supabase) {
  const [{ data: leads }, { data: angebote }, { data: auftraege }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, status, created_at')
      .not('status', 'eq', 'abgebrochen'),
    supabase.from('angebote').select('id, lead_id, status_einfach, status, created_at'),
    supabase
      .from('auftraege')
      .select('id, lead_id, angebot_id, status, created_at, updated_at')
      .neq('status', 'storniert'),
  ])

  const leadRows = leads ?? []
  const angebotRows = angebote ?? []
  const auftragRows = auftraege ?? []

  const leadIds = new Set(leadRows.map((l) => l.id))
  const leadsMitAngebot = new Set(angebotRows.map((a) => a.lead_id).filter(Boolean))
  const leadsMitAuftrag = new Set(auftraegeRowsLeadIds(auftragRows))
  const leadsAbgeschlossen = leadRows.filter((l) => l.status === 'abgeschlossen').length

  const angeboteAngenommen = angebotRows.filter((a) => {
    const s = String(a.status_einfach ?? a.status ?? '').toLowerCase()
    return /akzept|angenom|zugew|kunde_akzeptiert/.test(s)
  }).length

  const auftraegeAbgeschlossen = auftragRows.filter((a) => a.status === 'abgeschlossen').length
  const auftraegeAktiv = auftragRows.filter((a) =>
    ['offen', 'in_arbeit', 'abnahme'].includes(String(a.status))
  ).length

  const stufen = [
    {
      key: 'anfragen',
      label: 'Anfragen',
      count: leadRows.length,
      rate_von_vorher: null,
    },
    {
      key: 'mit_angebot',
      label: 'Mit Angebot',
      count: [...leadsMitAngebot].filter((id) => leadIds.has(id)).length,
      rate_von_vorher: pct([...leadsMitAngebot].filter((id) => leadIds.has(id)).length, leadRows.length),
    },
    {
      key: 'angebote_gesamt',
      label: 'Angebote (gesamt)',
      count: angebotRows.length,
      rate_von_vorher: null,
    },
    {
      key: 'angebote_angenommen',
      label: 'Angebote angenommen',
      count: angeboteAngenommen,
      rate_von_vorher: pct(angeboteAngenommen, angebotRows.length),
    },
    {
      key: 'auftraege',
      label: 'Aufträge',
      count: auftragRows.length,
      rate_von_vorher: pct(auftragRows.length, angebotRows.length),
    },
    {
      key: 'auftraege_aktiv',
      label: 'Aufträge aktiv',
      count: auftraegeAktiv,
      rate_von_vorher: null,
    },
    {
      key: 'abgeschlossen',
      label: 'Abgeschlossen',
      count: auftraegeAbgeschlossen,
      rate_von_vorher: pct(auftraegeAbgeschlossen, auftragRows.length),
    },
  ]

  const zyklen = computeZyklen(leadRows, angebotRows, auftragRows)

  const ergebnis = {
    hinweis:
      'Verknüpfung über lead_id — keine separate Funnel-ID nötig. Anfrage → Angebot → Auftrag.',
    stufen,
    zyklen,
    kennzahlen: {
      leads_gesamt: leadRows.length,
      leads_mit_angebot: [...leadsMitAngebot].filter((id) => leadIds.has(id)).length,
      leads_mit_auftrag: [...leadsMitAuftrag].filter((id) => leadIds.has(id)).length,
      leads_abgeschlossen: leadsAbgeschlossen,
      angebote_gesamt: angebotRows.length,
      angebote_angenommen: angeboteAngenommen,
      auftraege_gesamt: auftragRows.length,
      auftraege_abgeschlossen: auftraegeAbgeschlossen,
      conversion_anfrage_zu_angebot: pct(
        [...leadsMitAngebot].filter((id) => leadIds.has(id)).length,
        leadRows.length
      ),
      conversion_angebot_zu_auftrag: pct(auftragRows.length, angebotRows.length),
    },
  }

  return upsertKiAnalyse(supabase, {
    bereich: FUNNEL_BEREICH,
    analyse_key: FUNNEL_KEY,
    titel: 'Gesamt-Funnel',
    sample_size: leadRows.length,
    ergebnis,
  })
}

function auftraegeRowsLeadIds(rows) {
  return new Set(rows.map((a) => a.lead_id).filter(Boolean))
}
