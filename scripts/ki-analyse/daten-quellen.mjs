/**
 * Vereinheitlichte CRM-Daten aus Supabase für alle KI-Analysen.
 * Quellen: auftrag_positionen + angebote.positionen (JSON) + leads + gewerke
 */

function normName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function parseAngebotPosition(raw, gewerkeMap, num) {
  if (!raw || typeof raw !== 'object') return null
  const r = raw
  const gewerkId = String(r.gewerk_id ?? '')
  const gewerk_name =
    normName(r.gewerk_name) || gewerkeMap.get(gewerkId) || normName(r.gewerk_slug) || 'Sonstiges'
  const leistung = normName(r.leistung ?? r.leistung_name)
  if (!leistung && gewerk_name === 'Sonstiges') return null

  const menge = Math.max(num(r.menge), 0.0001)
  let vk = num(r.gesamt_fix)
  if (vk <= 0) vk = num(r.gesamt_min) || num(r.gesamt_max)
  if (vk <= 0) {
    const vkNetto = num(r.vk_netto)
    const lohn = num(r.lohn_netto) || num(r.lohn_fix) || num(r.lohn_min)
    const mat = num(r.material_netto) || num(r.material_fix) || num(r.material_min)
    vk = vkNetto > 0 ? Math.round(vkNetto * menge * 100) / 100 : Math.round((lohn + mat) * menge * 100) / 100
  }

  const ek =
    num(r.einkaufspreis) ||
    num(r.einkaufspreis_min) ||
    num(r.einkaufspreis_max) ||
    num(r.preis_partner)

  return {
    leistung_name: leistung || 'Leistung',
    gewerk_name,
    preis_fix: vk,
    preis_partner: ek,
    lohn_fix: num(r.lohn_fix) || num(r.lohn_netto),
    material_fix: num(r.material_fix) || num(r.material_netto),
    menge: 1,
    handwerker_id: r.handwerker_id ? String(r.handwerker_id) : null,
    projekt_phase: r.projekt_phase ? String(r.projekt_phase) : null,
    start_datum: null,
    end_datum: null,
    sort_order: num(r.sort_order),
  }
}

function mapAuftragPosition(p) {
  return {
    leistung_name: normName(p.leistung_name) || 'Leistung',
    gewerk_name: normName(p.gewerk_name) || 'Sonstiges',
    preis_fix: p.preis_fix,
    preis_partner: p.preis_partner,
    lohn_fix: p.lohn_fix,
    material_fix: p.material_fix,
    menge: p.menge,
    handwerker_id: p.handwerker_id,
    projekt_phase: p.projekt_phase,
    start_datum: p.start_datum,
    end_datum: p.end_datum,
    sort_order: p.sort_order ?? 0,
  }
}

function leadMeta(lead, plzRegion) {
  if (!lead) return { plz: null, bereiche: [], plz_region: 'unbekannt', kanal: null }
  const plz = lead.plz ?? null
  return {
    plz,
    bereiche: Array.isArray(lead.bereiche) ? lead.bereiche : [],
    plz_region: plzRegion(plz),
    kanal: lead.kanal ?? null,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ num: (v: unknown) => number, plzRegion: (plz: string | null | undefined) => string }} helpers
 */
export async function loadKiAnalyseDaten(supabase, helpers) {
  const { num, plzRegion } = helpers

  const [{ data: gewerke }, { data: auftraege }, { data: angebote }, { count: leadsCount }] =
    await Promise.all([
      supabase.from('gewerke').select('id, name, slug'),
      supabase.from('auftraege').select('id, status, lead_id, angebot_id, start_datum, end_datum').neq('status', 'storniert'),
      supabase
        .from('angebote')
        .select('id, lead_id, status_einfach, gesamt_fix, gesamt_min, gesamt_max, positionen, leads ( plz, bereiche, kanal )'),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
    ])

  const gewerkeMap = new Map((gewerke ?? []).map((g) => [String(g.id), normName(g.name) || normName(g.slug)]))

  const auftragRows = auftraege ?? []
  const angebotIdsMitAuftrag = new Set(
    auftragRows.map((a) => a.angebot_id).filter(Boolean)
  )

  let auftragPositionen = []
  if (auftragRows.length) {
    const { data, error } = await supabase
      .from('auftrag_positionen')
      .select(
        'auftrag_id, gewerk_name, leistung_name, projekt_phase, start_datum, end_datum, preis_fix, lohn_fix, material_fix, preis_partner, menge, handwerker_id, sort_order'
      )
      .in(
        'auftrag_id',
        auftragRows.map((a) => a.id)
      )
    if (error) throw new Error(`auftrag_positionen: ${error.message}`)
    auftragPositionen = data ?? []
  }

  const leadIds = [
    ...new Set([
      ...auftragRows.map((a) => a.lead_id).filter(Boolean),
      ...(angebote ?? []).map((a) => a.lead_id).filter(Boolean),
    ]),
  ]

  let leadMap = new Map()
  if (leadIds.length) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, plz, bereiche, kanal, status')
      .in('id', leadIds)
    leadMap = new Map((leads ?? []).map((l) => [l.id, l]))
  }

  /** @type {import('./daten-quellen.types').KiGewerkBlock[]} */
  const blocks = []

  const posByAuftrag = new Map()
  for (const p of auftragPositionen) {
    const list = posByAuftrag.get(p.auftrag_id) ?? []
    list.push(mapAuftragPosition(p))
    posByAuftrag.set(p.auftrag_id, list)
  }

  for (const auftrag of auftragRows) {
    const lead = auftrag.lead_id ? leadMap.get(auftrag.lead_id) : null
    const meta = leadMeta(lead, plzRegion)
    const allPos = posByAuftrag.get(auftrag.id) ?? []
    const byGewerk = new Map()
    for (const p of allPos) {
      const g = p.gewerk_name
      if (!byGewerk.has(g)) byGewerk.set(g, [])
      byGewerk.get(g).push(p)
    }
    for (const [gewerk, positionen] of byGewerk) {
      blocks.push({
        quelle: 'auftrag',
        quelle_id: auftrag.id,
        lead_id: auftrag.lead_id,
        gewerk,
        status: auftrag.status,
        ...meta,
        positionen,
        start_datum: auftrag.start_datum,
        end_datum: auftrag.end_datum,
      })
    }
  }

  let angeboteGenutzt = 0
  for (const angebot of angebote ?? []) {
    if (angebotIdsMitAuftrag.has(angebot.id)) continue
    const rawPos = Array.isArray(angebot.positionen) ? angebot.positionen : []
    if (!rawPos.length) continue

    const leadEmbed = angebot.leads
    const lead =
      leadEmbed ??
      (angebot.lead_id ? leadMap.get(angebot.lead_id) : null)
    const meta = leadMeta(lead, plzRegion)

    const parsed = rawPos
      .map((r) => parseAngebotPosition(r, gewerkeMap, num))
      .filter(Boolean)
    if (!parsed.length) continue

    angeboteGenutzt += 1
    const byGewerk = new Map()
    for (const p of parsed) {
      if (!byGewerk.has(p.gewerk_name)) byGewerk.set(p.gewerk_name, [])
      byGewerk.get(p.gewerk_name).push(p)
    }

    for (const [gewerk, positionen] of byGewerk) {
      blocks.push({
        quelle: 'angebot',
        quelle_id: angebot.id,
        lead_id: angebot.lead_id,
        gewerk,
        status: angebot.status_einfach ?? 'entwurf',
        ...meta,
        positionen,
        start_datum: null,
        end_datum: null,
        gesamt_fix: num(angebot.gesamt_fix) || num(angebot.gesamt_min) || num(angebot.gesamt_max) || null,
      })
    }
  }

  const historik = await loadHistorikBlocks(supabase, { num })
  blocks.push(...historik.blocks)

  const positionenGesamt = blocks.reduce((s, b) => s + b.positionen.length, 0)

  const quellen = {
    auftraege: auftragRows.length,
    angebote: angeboteGenutzt,
    angebote_gesamt: (angebote ?? []).length,
    positionen: positionenGesamt,
    gewerk_bloecke: blocks.length,
    leads: leadsCount ?? leadMap.size,
    historisch_vorgaenge: historik.vorgaenge,
    historisch_positionen: historik.positionen,
    historisch_gebucht: historik.gebucht,
  }

  return { blocks, quellen, gewerkeMap }
}

function historikStatus(raw) {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'gebucht') return 'abgeschlossen'
  if (s.includes('angebot')) return 'angebot'
  return raw ?? 'historisch'
}

function plzFromAdresse(adresse) {
  const m = String(adresse ?? '').match(/\b(\d{5})\b/)
  return m?.[1] ?? null
}

/**
 * Excel-Historie aus ki_historische_* → gleiches Block-Format wie CRM-Daten.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function loadHistorikBlocks(supabase, { num }) {
  const [{ data: vorgaenge, error: vErr }, { data: positionen, error: pErr }] = await Promise.all([
    supabase.from('ki_historische_vorgaenge').select('*'),
    supabase.from('ki_historische_positionen').select('*'),
  ])

  if (vErr?.code === '42P01') {
    return { blocks: [], vorgaenge: 0, positionen: 0, gebucht: 0 }
  }
  if (vErr) throw new Error(`ki_historische_vorgaenge: ${vErr.message}`)
  if (pErr) throw new Error(`ki_historische_positionen: ${pErr.message}`)

  const vorgRows = vorgaenge ?? []
  if (!vorgRows.length) {
    return { blocks: [], vorgaenge: 0, positionen: 0, gebucht: 0 }
  }

  const posByDok = new Map()
  for (const p of positionen ?? []) {
    const list = posByDok.get(p.dokument_nr) ?? []
    list.push({
      leistung_name: normName(p.leistung) || 'Leistung',
      gewerk_name: normName(p.gewerk) || 'Sonstiges',
      preis_fix: num(p.gesamt_netto) || num(p.einzelpreis_netto) * Math.max(num(p.menge), 1),
      preis_partner: 0,
      lohn_fix: 0,
      material_fix: 0,
      menge: num(p.menge) || 1,
      handwerker_id: null,
      projekt_phase: p.crm_modul ? String(p.crm_modul) : null,
      start_datum: null,
      end_datum: null,
      sort_order: list.length,
    })
    posByDok.set(p.dokument_nr, list)
  }

  /** @type {import('./daten-quellen.types').KiGewerkBlock[]} */
  const blocks = []

  for (const v of vorgRows) {
    const allPos = posByDok.get(v.dokument_nr) ?? []
    const plz = plzFromAdresse(v.objekt_adresse)
    const plz_region = plz ? `${plz.slice(0, 2)}xxx` : 'historik'

    if (!allPos.length) {
      blocks.push({
        quelle: 'historisch',
        quelle_id: v.dokument_nr,
        lead_id: null,
        gewerk: normName(v.gewerk) || 'Sonstiges',
        status: historikStatus(v.status),
        plz,
        bereiche: [],
        plz_region,
        kanal: 'historik',
        positionen: [
          {
            leistung_name: normName(v.taetigkeit) || 'Vorgang',
            gewerk_name: normName(v.gewerk) || 'Sonstiges',
            preis_fix: num(v.netto) || 0,
            preis_partner: 0,
            lohn_fix: 0,
            material_fix: 0,
            menge: 1,
            handwerker_id: null,
            projekt_phase: null,
            start_datum: null,
            end_datum: null,
            sort_order: 0,
          },
        ],
        start_datum: null,
        end_datum: null,
        gesamt_fix: num(v.netto) || null,
      })
      continue
    }

    const byGewerk = new Map()
    for (const p of allPos) {
      const g = p.gewerk_name
      if (!byGewerk.has(g)) byGewerk.set(g, [])
      byGewerk.get(g).push(p)
    }

    for (const [gewerk, positionenList] of byGewerk) {
      blocks.push({
        quelle: 'historisch',
        quelle_id: v.dokument_nr,
        lead_id: null,
        gewerk,
        status: historikStatus(v.status),
        plz,
        bereiche: [],
        plz_region,
        kanal: 'historik',
        positionen: positionenList,
        start_datum: null,
        end_datum: null,
        gesamt_fix: num(v.netto) || null,
      })
    }
  }

  const gebucht = vorgRows.filter((v) => String(v.status).toLowerCase() === 'gebucht').length

  return {
    blocks,
    vorgaenge: vorgRows.length,
    positionen: (positionen ?? []).length,
    gebucht,
  }
}

export function blockVkEk(positionen, num) {
  let vk = 0
  let ekPartner = 0
  let ekEigen = 0
  for (const p of positionen) {
    const lineVk =
      num(p.preis_fix) ||
      (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
    vk += lineVk
    if (p.handwerker_id) {
      ekPartner +=
        num(p.preis_partner) ||
        (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
    } else {
      ekEigen += (num(p.lohn_fix) + num(p.material_fix)) * Math.max(num(p.menge), 1)
    }
  }
  return { vk, ek: ekPartner + ekEigen, ekPartner, ekEigen }
}

export function quellenHinweis(quellen) {
  let s = `Daten aus Supabase: ${quellen.auftraege} Aufträge, ${quellen.angebote} Angebote (${quellen.positionen} Positionen in ${quellen.gewerk_bloecke} Gewerk-Blöcken), ${quellen.leads} Leads.`
  if (quellen.historisch_vorgaenge > 0) {
    s += ` Inkl. Historik: ${quellen.historisch_vorgaenge} Rechnungen/Angebote (${quellen.historisch_gebucht} gebucht, ${quellen.historisch_positionen} Positionen) aus Excel-Import.`
  }
  return s
}
