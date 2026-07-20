import { upsertKiAnalyse } from './upsert.mjs'
import { norm, inc, topN } from './funnel-parse.mjs'

export const DAUER_KEY = 'planung_ist_bautagebuch'
export const DAUER_BEREICH = 'dauer'

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function daysBetween(from, to) {
  if (!from || !to) return null
  const a = new Date(String(from).slice(0, 10))
  const b = new Date(String(to).slice(0, 10))
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
}

function pushSnippet(list, item, limit) {
  if (list.length >= limit) return
  list.push(item)
}

/** @param {unknown} raw */
function parseAbnahmePunkte(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter((p) => p && typeof p === 'object')
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function computeAndSaveDauerBautagebuch(supabase) {
  const [{ data: auftraege }, { data: bautagebuch }, { data: abnahmen }, { data: posNotizen }] =
    await Promise.all([
      supabase
        .from('auftraege')
        .select('id, start_datum, end_datum, status')
        .neq('status', 'storniert'),
      supabase
        .from('auftrag_bautagebuch_eintraege')
        .select('id, auftrag_id, titel, beschreibung, datum, gewerk_id, gewerke ( name )')
        .order('datum', { ascending: false })
        .limit(500),
      supabase
        .from('auftrag_abnahmeprotokolle')
        .select('id, auftrag_id, abnahme_datum, notizen, punkte, maengel')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('auftrag_position_notizen')
        .select(
          'id, datum, text, position_id, auftrag_positionen ( gewerk_name, leistung_name, auftrag_id )'
        )
        .order('datum', { ascending: false })
        .limit(500),
    ])

  const auftragRows = auftraege ?? []
  const auftragIds = auftragRows.map((a) => a.id)

  let positionen = []
  if (auftragIds.length) {
    const { data, error } = await supabase
      .from('auftrag_positionen')
      .select('gewerk_name, leistung_name, start_datum, end_datum, projekt_phase')
      .in('auftrag_id', auftragIds)
    if (error) throw new Error(`auftrag_positionen: ${error.message}`)
    positionen = data ?? []
  }

  const projektDauer = []
  for (const a of auftragRows) {
    const d = daysBetween(a.start_datum, a.end_datum)
    if (d != null) projektDauer.push(d)
  }

  const dauerJeGewerk = new Map()
  const dauerJeLeistung = new Map()

  for (const p of positionen) {
    const d = daysBetween(p.start_datum, p.end_datum)
    if (d == null) continue
    const gewerk = norm(p.gewerk_name) || 'Sonstiges'
    const leistung = norm(p.leistung_name) || 'Leistung'
    if (!dauerJeGewerk.has(gewerk)) dauerJeGewerk.set(gewerk, [])
    dauerJeGewerk.get(gewerk).push(d)
    const lk = `${gewerk} · ${leistung}`
    if (!dauerJeLeistung.has(lk)) dauerJeLeistung.set(lk, [])
    dauerJeLeistung.get(lk).push(d)
  }

  const gewerkZeilen = [...dauerJeGewerk.entries()]
    .map(([gewerk, vals]) => ({
      gewerk,
      anzahl: vals.length,
      dauer_tage_median: median(vals) != null ? Math.round(median(vals)) : null,
    }))
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 12)

  // —— Bautagebuch ——
  const btRows = bautagebuch ?? []
  const titelMap = new Map()
  const gewerkBt = new Map()
  const btSnippets = []

  for (const e of btRows) {
    inc(titelMap, norm(e.titel))
    const gName =
      (e.gewerke && !Array.isArray(e.gewerke) ? e.gewerke.name : null) || 'Ohne Gewerk'
    inc(gewerkBt, gName)
    const text = norm(e.beschreibung)
    if (text) {
      pushSnippet(btSnippets, {
        quelle: 'bautagebuch',
        datum: e.datum,
        gewerk: gName,
        titel: norm(e.titel),
        text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
      }, 6)
    }
  }

  // —— Positions-Notizen ——
  const notizRows = posNotizen ?? []
  const notizGewerkMap = new Map()
  const notizSnippets = []

  for (const n of notizRows) {
    const pos = n.auftrag_positionen
    const posRow = Array.isArray(pos) ? pos[0] : pos
    const gewerk = norm(posRow?.gewerk_name) || 'Sonstiges'
    const leistung = norm(posRow?.leistung_name) || 'Leistung'
    inc(notizGewerkMap, gewerk)
    const text = norm(n.text)
    if (text) {
      pushSnippet(notizSnippets, {
        quelle: 'positions_notiz',
        datum: n.datum,
        gewerk,
        titel: leistung,
        text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
      }, 6)
    }
  }

  // —— Abnahme / Mängel ——
  const abnahmeRows = abnahmen ?? []
  const mangelTextMap = new Map()
  const mangelGewerkMap = new Map()
  const abnahmeSnippets = []
  let punkteGesamt = 0
  let punkteMangel = 0
  let maengelGesamt = 0

  for (const proto of abnahmeRows) {
    const punkte = parseAbnahmePunkte(proto.punkte)
    const maengel = parseAbnahmePunkte(proto.maengel)

    for (const p of punkte) {
      punkteGesamt += 1
      const gewerk = norm(p.gewerk) || 'Sonstiges'
      const beschreibung = norm(p.beschreibung)
      if (p.status === 'mangel') {
        punkteMangel += 1
        inc(mangelGewerkMap, gewerk)
        if (beschreibung) inc(mangelTextMap, beschreibung)
        const notiz = norm(p.notiz)
        const text = notiz || beschreibung
        if (text) {
          pushSnippet(abnahmeSnippets, {
            quelle: 'abnahme_punkt',
            datum: proto.abnahme_datum,
            gewerk,
            titel: norm(p.leistung_name) || 'Checkliste',
            text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
          }, 6)
        }
      }
    }

    for (const m of maengel) {
      maengelGesamt += 1
      const text = norm(m.beschreibung)
      if (text) {
        inc(mangelTextMap, text)
        pushSnippet(abnahmeSnippets, {
          quelle: 'abnahme_mangel',
          datum: proto.abnahme_datum,
          gewerk: 'Abnahme',
          titel: 'Mangel',
          text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
        }, 6)
      }
    }

    const protoNotiz = norm(proto.notizen)
    if (protoNotiz) {
      pushSnippet(abnahmeSnippets, {
        quelle: 'abnahme_notiz',
        datum: proto.abnahme_datum,
        gewerk: 'Abnahme',
        titel: 'Protokoll-Notiz',
        text: protoNotiz.length > 180 ? `${protoNotiz.slice(0, 177)}…` : protoNotiz,
      }, 4)
    }
  }

  const auftraegeMitBt = new Set(btRows.map((e) => e.auftrag_id)).size
  const auftraegeMitAbnahme = new Set(abnahmeRows.map((a) => a.auftrag_id)).size
  const kontextSnippets = [...btSnippets, ...notizSnippets, ...abnahmeSnippets].slice(0, 12)

  let hinweis = `${auftragRows.length} Aufträge · Bautagebuch ${btRows.length} · Positions-Notizen ${notizRows.length} · Abnahmeprotokolle ${abnahmeRows.length}.`
  hinweis += ' Dauer aus Terminen (wenn gepflegt). Mängel aus Abnahme-Checkliste und Mängelliste.'
  if (!projektDauer.length && kontextSnippets.length < 3) {
    hinweis += ' Mehr Einträge im Bautagebuch, an Leistungen und in der Abnahme verbessern die KI-Auswertung.'
  }

  const ergebnis = {
    hinweis,
    projekt: {
      auftraege: auftragRows.length,
      mit_dauer: projektDauer.length,
      dauer_tage_median: median(projektDauer) != null ? Math.round(median(projektDauer)) : null,
    },
    je_gewerk: gewerkZeilen,
    bautagebuch: {
      eintraege: btRows.length,
      auftraege_mit_eintraegen: auftraegeMitBt,
      haeufige_titel: topN(titelMap, 10),
      je_gewerk: topN(gewerkBt, 8),
      snippets: btSnippets,
    },
    positions_notizen: {
      eintraege: notizRows.length,
      je_gewerk: topN(notizGewerkMap, 8),
      snippets: notizSnippets,
    },
    abnahme: {
      protokolle: abnahmeRows.length,
      auftraege_mit_abnahme: auftraegeMitAbnahme,
      checkliste_punkte: punkteGesamt,
      checkliste_maengel: punkteMangel,
      maengel_eintraege: maengelGesamt,
      haeufige_maengel: topN(mangelTextMap, 12),
      je_gewerk: topN(mangelGewerkMap, 8),
      snippets: abnahmeSnippets,
    },
    kontext_snippets: kontextSnippets,
  }

  const sampleSize =
    positionen.length + btRows.length + notizRows.length + abnahmeRows.length + maengelGesamt

  return upsertKiAnalyse(supabase, {
    bereich: DAUER_BEREICH,
    analyse_key: DAUER_KEY,
    titel: 'Baustelle & Abnahme',
    sample_size: sampleSize,
    ergebnis,
  })
}
