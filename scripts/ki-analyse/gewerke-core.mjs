import { upsertKiAnalyse } from './upsert.mjs'
import { loadKiAnalyseDaten, blockVkEk, quellenHinweis } from './daten-quellen.mjs'

const KI_MIN_AUFTRAEGE = 2
const PHASE_ORDER = ['Planung', 'Vorbereitung', 'Ausführung', 'Abnahme', 'Rechnung']

export const GEWERKE_KEY = 'ablauf_je_gewerk'
export const GEWERKE_BEREICH = 'gewerke'

function phaseKey(raw) {
  const p = String(raw ?? '').trim()
  return p || 'Ausführung'
}

function minDate(values) {
  const dates = values.map((d) => String(d ?? '').slice(0, 10)).filter(Boolean)
  if (!dates.length) return null
  return dates.sort()[0]
}

function maxDate(values) {
  const dates = values.map((d) => String(d ?? '').slice(0, 10)).filter(Boolean)
  if (!dates.length) return null
  return dates.sort().at(-1)
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
/** @param {{ num: (v: unknown) => number, median: (v: number[]) => number, daysBetween: (a: string, b: string) => number | null, plzRegion: (plz: string | null | undefined) => string }} helpers */
export async function computeAndSaveGewerkeAblauf(supabase, helpers) {
  const { num, median, daysBetween, plzRegion } = helpers
  const { blocks, quellen } = await loadKiAnalyseDaten(supabase, { num, plzRegion })

  if (!blocks.length) {
    return upsertKiAnalyse(supabase, {
      bereich: GEWERKE_BEREICH,
      analyse_key: GEWERKE_KEY,
      titel: 'Auftragsablauf je Gewerk',
      sample_size: 0,
      ergebnis: {
        schwellwert: KI_MIN_AUFTRAEGE,
        hinweis: 'Noch keine Daten in Supabase.',
        quellen,
        zeilen: [],
      },
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
    const leistungCount = new Map()
    const phaseDurations = new Map()
    const gesamtDauer = []
    const vkList = []
    const ekPartnerList = []
    const ekEigenList = []
    const fremdAnteile = []
    const phasePresence = new Map()
    let ausAngeboten = 0

    for (const block of gewerkBlocks) {
      const pos = block.positionen
      const { vk, ekPartner, ekEigen } = blockVkEk(pos, num)
      let totalVk = vk
      if (totalVk <= 0 && block.gesamt_fix) totalVk = block.gesamt_fix
      if (totalVk <= 0) continue

      if (block.quelle === 'angebot') ausAngeboten += 1

      vkList.push(totalVk)
      ekPartnerList.push(ekPartner)
      ekEigenList.push(ekEigen)

      let fremd = 0
      for (const p of pos) {
        if (p.handwerker_id) fremd += 1
        const name = (p.leistung_name || 'Leistung').trim()
        leistungCount.set(name, (leistungCount.get(name) ?? 0) + 1)
      }
      fremdAnteile.push(pos.length > 0 ? (fremd / pos.length) * 100 : 0)

      const von = minDate(pos.map((p) => p.start_datum)) ?? block.start_datum
      const bis = maxDate(pos.map((p) => p.end_datum)) ?? block.end_datum
      const totalDays = daysBetween(von, bis)
      if (totalDays != null) gesamtDauer.push(totalDays)

      for (const ph of PHASE_ORDER) {
        const inPhase = pos.filter((p) => phaseKey(p.projekt_phase) === ph)
        if (!inPhase.length) continue
        phasePresence.set(ph, (phasePresence.get(ph) ?? 0) + 1)
        const pVon = minDate(inPhase.map((p) => p.start_datum)) ?? von
        const pBis = maxDate(inPhase.map((p) => p.end_datum)) ?? bis
        const d = daysBetween(pVon, pBis)
        if (d != null) {
          if (!phaseDurations.has(ph)) phaseDurations.set(ph, [])
          phaseDurations.get(ph).push(d)
        }
      }
    }

    const auftraegeCount = vkList.length
    if (auftraegeCount === 0) continue

    const totalVk = vkList.reduce((s, v) => s + v, 0)
    const totalEk =
      ekPartnerList.reduce((s, v) => s + v, 0) + ekEigenList.reduce((s, v) => s + v, 0)
    const margeProzent = totalVk > 0 ? ((totalVk - totalEk) / totalVk) * 100 : 0

    const totalLeistungen = [...leistungCount.values()].reduce((s, c) => s + c, 0)
    const typischeLeistungen = [...leistungCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        count,
        anteil_prozent: totalLeistungen > 0 ? Math.round((count / totalLeistungen) * 1000) / 10 : 0,
      }))

    const phasenAblauf = PHASE_ORDER.filter((ph) => (phasePresence.get(ph) ?? 0) > 0).map(
      (ph, idx) => ({
        phase: ph,
        reihenfolge: idx + 1,
        auftraege_mit_phase: phasePresence.get(ph) ?? 0,
        dauer_tage_median: phaseDurations.has(ph) ? Math.round(median(phaseDurations.get(ph))) : null,
      })
    )

    const ablaufTeile = phasenAblauf.map((p) => {
      const d = p.dauer_tage_median
      return d != null ? `${p.phase} (~${d} T)` : p.phase
    })

    zeilen.push({
      gewerk,
      auftraege: auftraegeCount,
      aus_angeboten: ausAngeboten,
      positionen_gesamt: totalLeistungen,
      typische_leistungen: typischeLeistungen,
      phasen_ablauf: phasenAblauf,
      ablauf_text: ablaufTeile.join(' → ') || 'Leistungspaket (Phasen aus Angeboten)',
      dauer_gesamt_tage_median: gesamtDauer.length ? Math.round(median(gesamtDauer)) : null,
      vk_median: Math.round(median(vkList)),
      ek_partner_median: Math.round(median(ekPartnerList)),
      ek_eigen_median: Math.round(median(ekEigenList)),
      marge_prozent: Math.round(margeProzent * 10) / 10,
      fremdleistung_anteil_prozent: Math.round(median(fremdAnteile) * 10) / 10,
      verlaesslich: auftraegeCount >= KI_MIN_AUFTRAEGE,
    })
  }

  zeilen.sort((a, b) => b.auftraege - a.auftraege)

  const sampleSize = zeilen.reduce((s, z) => s + z.auftraege, 0)
  let hinweis = `${quellenHinweis(quellen)} Ablauf aus Auftragspositionen und Angebots-Positionen.`
  if (sampleSize < KI_MIN_AUFTRAEGE) {
    hinweis += ` Mehr abgeschlossene Aufträge mit Phasen/Daten verbessern die Dauer-Schätzung.`
  }

  return upsertKiAnalyse(supabase, {
    bereich: GEWERKE_BEREICH,
    analyse_key: GEWERKE_KEY,
    titel: 'Auftragsablauf je Gewerk',
    sample_size: sampleSize,
    ergebnis: {
      schwellwert: KI_MIN_AUFTRAEGE,
      hinweis,
      quellen,
      zeilen,
    },
  })
}
