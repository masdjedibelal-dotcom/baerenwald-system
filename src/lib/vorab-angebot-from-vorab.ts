import type { AngebotPosition, Gewerk, Preisliste } from '@/lib/types'
import { neuePositionsId } from '@/lib/angebot-positionen'
import { BEREICH_TO_GEWERK, FACHDETAIL_TO_LEISTUNG } from '@/lib/utils'
import { VOR_ORT_SCHEMA, type SituationValue } from '@/lib/vorab-formular-config'

export type VorOrtProjekt = {
  situation: SituationValue | ''
  bereiche: string[]
  kundentyp: string
  angaben_korrekt: 'ja' | 'teilweise' | 'nein' | ''
  korrektur_notiz: string
}

export type VorOrtKalkulation = {
  kalk_min: number | ''
  kalk_max: number | ''
  begruendung: string
  zeit_arbeitstage: number | ''
  komplexitaet: 'standard' | 'erhoeht' | 'komplex' | ''
}

/** Gespeicherte Struktur unter vorab_formulare.daten */
export type VorOrtFormDaten = {
  _schema: typeof VOR_ORT_SCHEMA
  projekt: VorOrtProjekt
  /** bereich → gewählter Fachdetail-Wert (z. B. bad → komplett) */
  fachdetails: Record<string, string>
  groessen: Record<string, number | ''>
  zustand: {
    gesamtzustand: 'besser' | 'wie_erwartet' | 'schlechter' | ''
    unvorhergesehenes: boolean
    unvorhergesehenes_txt: string
    zusatzarbeiten: boolean
    zusatzarbeiten_txt: string
    schimmel: boolean
    schimmel_wo: string
    schimmel_ausmass: 'klein' | 'mittel' | 'gross' | ''
  }
  logistik: {
    adresse_bestaetigt: boolean
    etage: number | ''
    aufzug: boolean
    parkplatz: boolean
    halteverbot: boolean
    schluesseluebergabe: boolean
    zugangsdetails: string
    ruhezeiten: string
  }
  kalkulation: VorOrtKalkulation
  wuensche: {
    startdatum: string
    flexibilitaet: 'sehr' | 'etwas' | 'fix' | ''
    material: string
    besondere: string
    budget_feedback: 'passt' | 'hoch' | 'zu_hoch' | ''
  }
  fotos: {
    istzustand: string[]
    problem: string[]
    gesamt: string[]
    masse: string[]
  }
  abgeschlossen_am: string | null
}

export function isVorOrtStruktur(daten: unknown): daten is VorOrtFormDaten {
  if (!daten || typeof daten !== 'object') return false
  const o = daten as Record<string, unknown>
  return o._schema === VOR_ORT_SCHEMA && typeof o.projekt === 'object' && o.projekt != null
}

function normLeistung(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]+/g, ' ')
    .trim()
}

function findPreisliste(
  gewerkId: string,
  leistungHint: string | undefined,
  preislisten: Preisliste[]
): Preisliste | null {
  const pool = preislisten.filter((p) => p.gewerk_id === gewerkId && p.aktiv)
  if (!pool.length) return null
  if (!leistungHint) return pool[0]
  const hint = normLeistung(leistungHint)
  const exact = pool.find((p) => normLeistung(p.leistung) === hint)
  if (exact) return exact
  const words = hint.split(/\s+/).filter(Boolean)
  const partial = pool.find((p) => {
    const n = normLeistung(p.leistung)
    return words.some((w) => w.length > 2 && n.includes(w))
  })
  return partial ?? pool[0]
}

/** Mittlerer Aufschlag bei „erhöht“ */
const KOMPLEX_ERHOEHT_FAKTOR = 1.2

export function angebotPositionenFromVorOrt(
  daten: VorOrtFormDaten,
  gewerke: Gewerk[],
  preislisten: Preisliste[]
): {
  positionen: AngebotPosition[]
  preisAngepasstHinweis: boolean
  komplexitaet: string
} {
  const bereiche = daten.projekt?.bereiche ?? []
  const situation = daten.projekt?.situation ?? ''
  const positionen: AngebotPosition[] = []
  let preisAngepasstHinweis = false
  const komplex = daten.kalkulation?.komplexitaet ?? ''

  const faktor =
    komplex === 'erhoeht'
      ? KOMPLEX_ERHOEHT_FAKTOR
      : komplex === 'komplex'
        ? null
        : 1

  if (komplex === 'erhoeht' || komplex === 'komplex') preisAngepasstHinweis = true

  for (const bereich of bereiche) {
    const slug = BEREICH_TO_GEWERK[bereich]
    if (!slug) continue
    const g = gewerke.find((x) => x.slug === slug && x.aktiv)
    if (!g) continue

    const fd = daten.fachdetails?.[bereich] ?? ''
    const mapKey = fd ? `${bereich}.${fd}` : ''
    const leistungHint =
      (mapKey && FACHDETAIL_TO_LEISTUNG[mapKey]) ||
      (bereich === 'elektrik' && (situation === 'kaputt' || situation === 'notfall')
        ? FACHDETAIL_TO_LEISTUNG[`elektrik.${fd}`]
        : undefined)

    const pl = findPreisliste(g.id, leistungHint, preislisten)
    if (!pl) continue

    const groesseRaw = daten.groessen?.[bereich]
    const menge =
      groesseRaw !== '' && groesseRaw != null && !Number.isNaN(Number(groesseRaw))
        ? Math.max(Number(groesseRaw), 0.01)
        : 1

    let preis_min = pl.preis_min
    let preis_max = pl.preis_max
    if (faktor != null) {
      preis_min = Math.round(preis_min * faktor)
      preis_max = Math.round(preis_max * faktor)
    }

    const notizParts: string[] = []
    if (fd) notizParts.push(`${bereich}: ${fd}`)
    if (bereich === 'bad' && daten.fachdetails?.bad_ausstattung) {
      notizParts.push(`Ausstattung: ${daten.fachdetails.bad_ausstattung}`)
    }

    const beschreibung = (leistungHint ?? pl.leistung).trim()
    const notizExtern = notizParts.length ? notizParts.join(' · ') : undefined

    const lohnFest =
      preis_min > 0 && preis_max > 0
        ? Math.round(((preis_min + preis_max) / 2) * 100) / 100
        : Math.max(preis_min, preis_max, 0)

    positionen.push({
      id: neuePositionsId(),
      gewerk_id: g.id,
      gewerk_name: g.name,
      leistung: pl.leistung,
      beschreibung,
      lohn_netto: lohnFest,
      material_netto: 0,
      gesamt_min: lohnFest,
      gesamt_max: lohnFest,
      menge,
      einheit: pl.einheit,
      notiz_extern: notizExtern,
      preis_typ: 'fix',
    })
  }

  return {
    positionen,
    preisAngepasstHinweis,
    komplexitaet: komplex || 'standard',
  }
}
