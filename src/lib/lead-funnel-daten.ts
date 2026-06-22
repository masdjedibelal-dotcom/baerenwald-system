import {
  BEREICHE,
  FACHDETAILS_CONFIG,
  GROESSEN_CONFIG,
  KUNDENTYP_OPTIONS,
  normalizeSituation,
  situationLabel,
} from '@/lib/vorab-formular-config'
import {
  websiteFachdetailOptionLabel,
  websiteFachdetailQuestionLabel,
  WEBSITE_FACHDETAIL_QUESTION_LABELS,
} from '@/lib/website-fachdetail-labels'
import { coerceBereicheArray } from '@/lib/lead-gewerbe-storage'
import { BEREICH_LABELS, FACHDETAIL_TO_LEISTUNG, SITUATION_LABELS } from '@/lib/utils'

export type LeadFunnelDaten = {
  fachdetails?: Record<string, string | string[]>
  groessen?: Record<string, number | string>
  positionen?: {
    leistung: string
    menge: number
    einheit: string
    preis_min: number
    preis_max: number
  }[]
  was_zeilen?: unknown[]
  kundentyp?: string
  quelle?: string
  preisModus?: string
  [key: string]: unknown
}

export function parseLeadFunnelDaten(raw: unknown): LeadFunnelDaten {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as LeadFunnelDaten
}

export interface NormalizedFunnelDaten {
  situation: string | null
  bereiche: string[]
  kundentyp: string | null
  zeitraum: string | null
  dringlichkeit: string | null
  zugaenglichkeit: string | null
  zustand: string | null
  badAusstattung: string | null
  plz: string | null
  groessen: Record<string, number>
  groessen_einheiten: Record<string, string>
  fachdetails: Record<string, string[]>
  breakdown: {
    gewerk?: string
    beschreibung?: string
    min?: number
    max?: number
    einheit?: string
  }[]
  preis_modus: string | null
  funnel_quelle: string | null
  umfang: string | null
  labels: {
    situation: string | null
    zeitraum: string | null
    kundentyp: string | null
    dringlichkeit: string | null
    zugaenglichkeit: string | null
    zustand: string | null
    umfang: string | null
    anfrage_typ: string | null
    funnel_quelle: string | null
    bereiche: string[]
  }
}

export const FUNNEL_SITUATION_LABELS: Record<string, string> = {
  erneuern: 'Umbau & Modernisierung',
  kaputt: 'Reparatur & Notfall',
  notfall: 'Notfall',
  neubauen: 'Neu bauen / Ausbau',
  betreuung: 'Betreuung',
  gewerbe: 'Gewerbe / Gastro',
}

export const ZUSTAND_LABELS: Record<string, string> = {
  gut: 'Gepflegt',
  normale_abnutzung: 'Normale Abnutzung',
  maessig: 'Normale Abnutzung',
  schlecht: 'Sanierungsbedürftig',
  sanierungsbed: 'Sanierungsbedürftig',
  unbekannt: 'Unbekannt',
}

export const FACHDETAIL_VALUE_LABELS: Record<string, string> = {
  waende: 'Wände streichen',
  waende_decke: 'Wände + Decke',
  tapezieren: 'Tapezieren',
  komplett: 'Alles komplett',
  fassade: 'Fassade außen',
  laminat: 'Laminat',
  parkett: 'Parkett neu',
  parkett_schleifen: 'Parkett schleifen',
  vinyl: 'Vinyl / Designboden',
  fliesen: 'Fliesen',
  teppich: 'Teppich',
  wartung: 'Wartung',
  heizkoerper: 'Heizkörper tauschen',
  gas: 'Gas-Therme',
  waermepumpe: 'Wärmepumpe',
  fernwaerme: 'Fernwärme',
  sicherungskasten: 'Sicherungskasten',
  leitungen: 'Neue Leitungen',
  echeck: 'E-Check',
  verstopfung: 'Verstopfung',
  leck: 'Leck / Rohrbruch',
  wc: 'WC Reparatur',
  armatur: 'Armatur defekt',
  pflege: 'Regelmäßige Pflege',
  gestaltung: 'Neugestaltung',
  baumarbeiten: 'Baumarbeiten',
  hecke: 'Heckenschnitt',
}

export const FUNNEL_ZEITRAUM_LABELS: Record<string, string> = {
  sofort: 'Sofort',
  heute: 'Heute noch',
  diese_woche: 'Diese Woche',
  woche: 'Diese Woche',
  vier_wochen: 'Bis zu 4 Wochen',
  naechste_woche: 'Nächste Woche',
  ein_monat: 'Innerhalb 1 Monat',
  zwei_monate: '1–2 Monate',
  drei_monate: '1–3 Monate',
  sechs_monate: '3–6 Monate',
  naechster_monat: 'Nächster Monat',
  naechste_saison: 'Nächste Saison',
  naechstes_jahr: 'Nächstes Jahr',
  flexibel: 'Flexibel',
  offen: 'Noch offen',
}

export const FUNNEL_KUNDENTYP_LABELS: Record<string, string> = {
  eigentuemer: 'Eigentümer',
  mieter: 'Mieter',
  verwaltung: 'Hausverwaltung',
  gewerbe: 'Gewerbe',
}

export const FUNNEL_DRINGLICHKEIT_LABELS: Record<string, string> = {
  sofort: 'Sofort (Notfall)',
  heute: 'Heute noch',
  diese_woche: 'Diese Woche',
  naechste_woche: 'Nächste Woche',
  flexibel: 'Flexibel',
}

export const FUNNEL_ZUGAENGLICH_LABELS: Record<string, string> = {
  einfach: 'Einfach zugänglich',
  mittel: 'Mittel zugänglich',
  schwer: 'Schwer zugänglich',
  unknown: 'Unbekannt',
  unbekannt: 'Unbekannt',
  sichtbar_zugaenglich: 'Sichtbar & zugänglich',
  schwer_zugaenglich: 'Schwer zugänglich',
  nicht_sichtbar: 'Nicht sichtbar',
}

export const FUNNEL_UMFANG_LABELS: Record<string, string> = {
  woechentlich: 'Wöchentlich',
  zweimal_monat: 'Alle 2 Wochen',
  monatlich: 'Monatlich',
  saisonal: 'Saisonal',
  einmalig: 'Einmalig',
  saison: 'Saison-Pauschale',
  nach_bedarf: 'Nach Bedarf',
  jahresvertrag: 'Jahresvertrag',
}

export const FUNNEL_QUELLE_LABELS: Record<string, string> = {
  rechner_haupt: 'Website-Rechner',
  beratung: 'Beratungsanfrage',
  ausserhalb: 'Außerhalb PLZ-Gebiet',
  komplex_rueckruf: 'Komplex / Rückruf',
}

export const FUNNEL_BEREICH_LABELS: Record<string, string> = {
  bad: 'Bad',
  heizung: 'Heizung',
  elektrik: 'Elektrik',
  waende: 'Wände / Anstrich',
  boden: 'Boden',
  fenster: 'Fenster / Türen',
  dach: 'Dach',
  fassade: 'Fassade',
  trockenbau: 'Trockenbau / Umbau',
  sanitaer: 'Sanitär / Wasser',
  schimmel: 'Schimmel / Feuchtigkeit',
  garten: 'Garten',
  reinigung: 'Reinigung',
  hausmeister: 'Hausmeister',
  winterdienst: 'Winterdienst',
  gewerbe: 'Gewerbe / Gastro',
}

const GEWERK_TO_CONFIG_KEY: Record<string, string> = {
  sanitaer: 'bad',
  bad: 'bad',
  heizung: 'heizung',
  elektro: 'elektrik',
  elektrik: 'elektrik',
  maler: 'waende',
  waende: 'waende',
  boden: 'boden',
  dach: 'dach',
  fassade: 'fassade',
  garten: 'garten',
  fenster: 'fenster',
  trockenbau: 'trockenbau',
  neubauen: 'trockenbau',
}

const FACHDETAIL_SUBKEY_TO_VALUE: Record<string, (v: string) => string> = {
  badWas: (v) => v,
  heizungWas: (v) => v,
  elektroWas: (v) => v,
  bodenWas: (v) => v,
  dachWas: (v) => v,
  gartenWas: (v) => v,
  fensterWas: (v) => v,
  fassadeWas: (v) => v,
  malerWas: (v) => v,
  problem: (v) => v,
  art: (v) => v,
  typ: (v) => v,
}

const SKIP_FACHDETAIL_VALUES = new Set(['null', '', 'undefined', 'false', 'true'])

const SKIP_FACHDETAIL_KEYS = new Set([
  'fachdetailAnswers',
  'projekt',
  'bereiche',
  'bereiche_sonstiges',
])

/** Keine Fachdetail-Zeilen — Top-Level-Funnel / technische Felder (nicht in der Übersicht). */
const FUNNEL_META_KEYS = new Set([
  'fachdetails',
  'groessen',
  'kundentyp',
  'quelle',
  'funnel_quelle',
  'funnelQuelle',
  'preisModus',
  'preis_modus',
  'preisKomplex',
  'komplex',
  'zeitraum',
  'umfang',
  'situation',
  'funnel_daten',
  'bereiche',
  'bereiche_sonstiges',
  'groesse',
  'groesseEinheit',
  'badAusstattung',
  'dringlichkeit',
  'zugaenglichkeit',
  'zustand',
  'breakdown',
  'formattedSummary',
  'technicalDetails',
  'was_zeilen',
  'positionen',
  'name',
  'vorname',
  'nachname',
  'email',
  'telefon',
  'plz',
  'photos',
  'photoCount',
  'submitted',
  'freitext',
  'nachricht',
  'message',
  'kontakt_nachricht',
  'notizen',
  'priceMin',
  'priceMax',
  'price_min',
  'price_max',
  'budget_ca',
  'budgetCheck',
  'istFallback',
  'selectedSlot',
  'showOmitHint',
  'umfangFaktor',
  'demo',
  'mock',
  'seed',
])

/** Nur echte Gewerk-/Fachdetail-Keys — keine Funnel-Meta (kundentyp, preis_modus, …). */
function isKnownFachdetailConfigKey(key: string): boolean {
  if (SKIP_FACHDETAIL_KEYS.has(key) || FUNNEL_META_KEYS.has(key)) return false
  if (key === 'projekt_gu') return true
  if (FACHDETAILS_CONFIG[key]) return true
  if (WEBSITE_FACHDETAIL_QUESTION_LABELS[key]) return true
  if (GEWERK_TO_CONFIG_KEY[key]) return true
  if (BEREICH_LABELS[key]) return true
  if (BEREICHE.some((b) => b.value === key)) return true
  return false
}

function fachdetailAnswerValues(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => websiteFachdetailOptionLabel(v.trim()))
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [websiteFachdetailOptionLabel(raw.trim())]
  }
  return []
}

const PROJEKT_DETAIL_LABELS: Record<string, string> = {
  ausbauRohbau: 'Rohbau vorhanden',
  ausbauDeckenhoehe: 'Deckenhöhe',
  durchbruchAnzahl: 'Durchbrüche',
  durchbruchTragend: 'Tragende Wand',
  terrasseMaterial: 'Terrasse Material',
  terrasseUnterbau: 'Terrasse Unterbau',
  gartenLeistung: 'Garten-Leistung',
  gartenTerrasseMaterial: 'Terrassen-Material',
  gartenZaun: 'Zaun',
  gartenZugaenglichkeit: 'Zugang Garten',
}

function mergeProjektFachdetails(
  fachdetails: Record<string, string[]>,
  projekt: Record<string, unknown> | undefined
) {
  if (!projekt || typeof projekt !== 'object') return
  const parts: string[] = []
  for (const [key, val] of Object.entries(projekt)) {
    if (val == null || val === '') continue
    const label = PROJEKT_DETAIL_LABELS[key] ?? key
    if (typeof val === 'boolean') {
      parts.push(`${label}: ${val ? 'Ja' : 'Nein'}`)
      continue
    }
    if (typeof val === 'number') {
      parts.push(`${label}: ${val}`)
      continue
    }
    if (typeof val === 'string') {
      parts.push(`${label}: ${websiteFachdetailOptionLabel(val)}`)
    }
  }
  if (parts.length) mergeFachdetailValues(fachdetails, 'projekt_gu', parts)
}

function mergeFachdetailAnswers(
  fachdetails: Record<string, string[]>,
  answers: Record<string, unknown> | undefined
) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return
  for (const [questionId, raw] of Object.entries(answers)) {
    const values = fachdetailAnswerValues(raw)
    if (!values.length) continue
    mergeFachdetailValues(fachdetails, questionId, values)
  }
}

/** Lesbare Einordnung: Preisrahmen, Komplex, Gewerbe, Beratung, Notfall. */
export function anfrageTypAnzeige(
  norm: Pick<
    NormalizedFunnelDaten,
    'preis_modus' | 'funnel_quelle' | 'situation' | 'bereiche' | 'zeitraum' | 'dringlichkeit'
  >,
  lead: { situation?: string | null; bereiche?: string[] | null; kanal?: string }
): string | null {
  const situation = norm.situation ?? lead.situation ?? null
  const bereiche = norm.bereiche.length
    ? norm.bereiche
    : coerceBereicheArray(lead.bereiche)
  const fq = norm.funnel_quelle
  const pm = norm.preis_modus?.toLowerCase()

  if (fq === 'komplex_rueckruf' || pm === 'komplex') {
    return 'Individuell / Komplex'
  }
  if (fq === 'beratung') return 'Beratung (ohne Preisrahmen)'
  if (fq === 'ausserhalb') return 'Außerhalb Gebiet'
  if (situation === 'gewerbe' || bereiche.includes('gewerbe')) {
    return 'Gewerblich'
  }
  if (
    (situation === 'kaputt' || situation === 'notfall') &&
    (norm.zeitraum === 'sofort' || norm.dringlichkeit === 'sofort')
  ) {
    return 'Notfall / akut'
  }
  if (pm === 'standard' || lead.kanal === 'website') {
    return 'Preisrahmen (Website)'
  }
  return null
}

const GEWERK_TO_BEREICH: Record<string, string> = {
  Sanitär: 'sanitaer',
  Bad: 'bad',
  Heizung: 'heizung',
  Elektrik: 'elektrik',
  Elektro: 'elektrik',
  Maler: 'waende',
  'Wände': 'waende',
  Boden: 'boden',
  Dach: 'dach',
  Fassade: 'fassade',
  Garten: 'garten',
  Fenster: 'fenster',
  Trockenbau: 'trockenbau',
  Reinigung: 'reinigung',
  Hausmeister: 'hausmeister',
  Schimmel: 'schimmel',
  Winterdienst: 'winterdienst',
}

const BEREICHE_MIT_GROESSE = new Set([
  'bad',
  'heizung',
  'waende',
  'boden',
  'fenster',
  'dach',
  'fassade',
  'trockenbau',
  'garten',
  'winterdienst',
  'reinigung',
])

export function fachdetailDisplayValue(configKey: string, val: string): string {
  const raw = val.trim()
  if (!raw) return ''
  return (
    FACHDETAIL_VALUE_LABELS[raw] ??
    FACHDETAIL_TO_LEISTUNG[`${configKey}.${raw}`] ??
    websiteFachdetailOptionLabel(raw) ??
    raw
  )
}

function allFachdetailDisplayValues(fachdetails: Record<string, string[]>): Set<string> {
  const seen = new Set<string>()
  for (const vals of Object.values(fachdetails)) {
    for (const v of vals) seen.add(v)
  }
  return seen
}

function dedupeFachdetails(fachdetails: Record<string, string[]>) {
  for (const key of Object.keys(fachdetails)) {
    const seen = new Set<string>()
    fachdetails[key] = fachdetails[key].filter((v) => {
      if (seen.has(v)) return false
      seen.add(v)
      return true
    })
  }
}

function mergeFachdetailValues(
  target: Record<string, string[]>,
  configKey: string,
  values: string[]
) {
  if (!target[configKey]) target[configKey] = []
  const seen = new Set(target[configKey])
  for (const val of values) {
    if (!val || typeof val !== 'string') continue
    if (SKIP_FACHDETAIL_VALUES.has(val)) continue
    const display = fachdetailDisplayValue(configKey, val)
    if (!display || seen.has(display)) continue
    seen.add(display)
    target[configKey].push(display)
  }
}

/** Zentrale Normalisierung roher Website-/CRM-`funnel_daten`. */
export function normalizeFunnelDaten(
  raw: unknown,
  leadBereiche?: string[] | null
): NormalizedFunnelDaten {
  const fd = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>

  const bereicheFromFunnel = coerceBereicheArray(fd.bereiche)
  const bereiche: string[] = bereicheFromFunnel.length
    ? bereicheFromFunnel
    : coerceBereicheArray(leadBereiche)

  const situation = typeof fd.situation === 'string' ? fd.situation : null

  const zeitraum =
    typeof fd.zeitraum === 'string'
      ? fd.zeitraum
      : typeof fd.umfang === 'string'
        ? fd.umfang
        : null

  const kundentyp = typeof fd.kundentyp === 'string' ? fd.kundentyp : null
  const dringlichkeit = typeof fd.dringlichkeit === 'string' ? fd.dringlichkeit : null
  const zugaenglichkeit = typeof fd.zugaenglichkeit === 'string' ? fd.zugaenglichkeit : null
  const zustand = typeof fd.zustand === 'string' ? fd.zustand : null
  const badAusstattung = typeof fd.badAusstattung === 'string' ? fd.badAusstattung : null
  const plz = typeof fd.plz === 'string' ? fd.plz.trim() || null : null

  const preis_modus =
    typeof fd.preis_modus === 'string'
      ? fd.preis_modus
      : typeof fd.preisModus === 'string'
        ? fd.preisModus
        : null

  const funnel_quelle =
    typeof fd.funnel_quelle === 'string'
      ? fd.funnel_quelle
      : typeof fd.quelle === 'string'
        ? fd.quelle
        : null

  const umfang = typeof fd.umfang === 'string' ? fd.umfang : null

  const breakdown = (
    Array.isArray(fd.breakdown)
      ? fd.breakdown.filter((item) => item && typeof item === 'object')
      : []
  ) as NormalizedFunnelDaten['breakdown']

  const rawFachdetails = fd.fachdetails as Record<string, unknown> | undefined
  const fachdetails: Record<string, string[]> = {}

  if (rawFachdetails && typeof rawFachdetails === 'object') {
    for (const [gewerk, details] of Object.entries(rawFachdetails)) {
      if (!isKnownFachdetailConfigKey(gewerk)) continue

      const configKey = GEWERK_TO_CONFIG_KEY[gewerk] ?? gewerk

      if (details && typeof details === 'object' && !Array.isArray(details)) {
        for (const [subKey, val] of Object.entries(details as Record<string, unknown>)) {
          if (!val || typeof val !== 'string') continue
          if (SKIP_FACHDETAIL_VALUES.has(val)) continue
          const transformer = FACHDETAIL_SUBKEY_TO_VALUE[subKey]
          const value = transformer ? transformer(val) : val
          if (value?.trim()) {
            mergeFachdetailValues(fachdetails, configKey, [value])
          }
        }
      }

      if (Array.isArray(details)) {
        const vals = (details as unknown[]).filter(
          (v): v is string =>
            typeof v === 'string' && v.trim().length > 0 && !SKIP_FACHDETAIL_VALUES.has(v)
        )
        if (vals.length) mergeFachdetailValues(fachdetails, configKey, vals)
      }

      if (typeof details === 'string' && details.trim() && !SKIP_FACHDETAIL_VALUES.has(details)) {
        mergeFachdetailValues(fachdetails, configKey, [details])
      }
    }

    const answers = rawFachdetails.fachdetailAnswers
    if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
      mergeFachdetailAnswers(fachdetails, answers as Record<string, unknown>)
    }
    const projekt = rawFachdetails.projekt
    if (projekt && typeof projekt === 'object' && !Array.isArray(projekt)) {
      mergeProjektFachdetails(fachdetails, projekt as Record<string, unknown>)
    }
  }

  if (breakdown.length > 0) {
    const globalSeen = allFachdetailDisplayValues(fachdetails)
    for (const b of breakdown) {
      if (!b.beschreibung?.trim()) continue
      const bereich = GEWERK_TO_BEREICH[b.gewerk?.trim() ?? ''] ?? 'sonstiges'
      if (bereich === 'sonstiges') continue
      const desc = b.beschreibung.trim()
      const display = fachdetailDisplayValue(bereich, desc)
      if (globalSeen.has(display)) continue
      mergeFachdetailValues(fachdetails, bereich, [desc])
      globalSeen.add(display)
    }
  }

  if (badAusstattung && (bereiche.includes('bad') || fachdetails.bad)) {
    mergeFachdetailValues(fachdetails, 'bad_ausstattung', [badAusstattung])
  }

  const groessen: Record<string, number> = {}
  mergeGroessen(groessen, groessenFromRecord(fd.groessen))

  const groesseVal = parseGroesseWert(fd.groesse)
  if (groesseVal != null) {
    const bereichMitGroesse = bereiche.find((b) => !groessen[b] && BEREICHE_MIT_GROESSE.has(b))
    if (bereichMitGroesse) groessen[bereichMitGroesse] = groesseVal
  }

  mergeGroessen(groessen, groessenFromFachdetails(fd.fachdetails))

  const groessen_einheiten: Record<string, string> = {}
  const rawEinheiten = fd.groessen_einheiten ?? fd.groesseEinheiten
  if (rawEinheiten && typeof rawEinheiten === 'object' && !Array.isArray(rawEinheiten)) {
    for (const [k, v] of Object.entries(rawEinheiten as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) groessen_einheiten[k] = v.trim()
    }
  }

  dedupeFachdetails(fachdetails)

  const labels = {
    situation: situation ? (FUNNEL_SITUATION_LABELS[situation] ?? situation) : null,
    zeitraum: zeitraum ? (FUNNEL_ZEITRAUM_LABELS[zeitraum] ?? zeitraum) : null,
    kundentyp: kundentyp ? (FUNNEL_KUNDENTYP_LABELS[kundentyp] ?? kundentyp) : null,
    dringlichkeit: dringlichkeit
      ? (FUNNEL_DRINGLICHKEIT_LABELS[dringlichkeit] ?? dringlichkeit)
      : null,
    zugaenglichkeit: zugaenglichkeit
      ? (FUNNEL_ZUGAENGLICH_LABELS[zugaenglichkeit] ?? zugaenglichkeit)
      : null,
    zustand: zustand ? (ZUSTAND_LABELS[zustand] ?? zustand) : null,
    umfang: umfang ? (FUNNEL_UMFANG_LABELS[umfang] ?? umfang) : null,
    funnel_quelle: funnel_quelle
      ? (FUNNEL_QUELLE_LABELS[funnel_quelle] ?? funnel_quelle)
      : null,
    bereiche: bereiche.map((b) => FUNNEL_BEREICH_LABELS[b] ?? BEREICH_LABELS[b] ?? b),
    anfrage_typ: null,
  }

  return {
    situation,
    bereiche,
    kundentyp,
    zeitraum,
    dringlichkeit,
    zugaenglichkeit,
    zustand,
    badAusstattung,
    plz,
    groessen,
    groessen_einheiten,
    fachdetails,
    breakdown,
    preis_modus,
    funnel_quelle,
    umfang,
    labels,
  }
}

export function leadSituationDisplay(situation: string | null | undefined): string {
  if (!situation?.trim()) return ''
  const n = normalizeSituation(situation) || situation
  return FUNNEL_SITUATION_LABELS[n] ?? SITUATION_LABELS[n] ?? situationLabel(n) ?? situation
}

export type FachdetailDisplayEntry = { configKey: string; values: string[] }

/** Website-Gewerk-Keys → CRM-Config-Keys (Reparatur-`sanitaer` bleibt `sanitaer`). */
const WEBSITE_GEWERK_TO_CONFIG: Record<string, string> = {
  heizung: 'heizung',
  elektro: 'elektrik',
  maler: 'waende',
  boden: 'boden',
  dach: 'dach',
  garten: 'garten',
  fenster: 'fenster',
  fassade: 'fassade',
  projekt: 'trockenbau',
}

function mapWebsiteGewerkKey(key: string): string {
  return WEBSITE_GEWERK_TO_CONFIG[key] ?? key
}

/** Volles `funnel_daten` vs. nur `fachdetails`-Objekt. */
function funnelDatenTopFromRaw(
  raw: Record<string, unknown> | undefined,
  fdTop?: Record<string, unknown>
): Record<string, unknown> {
  if (fdTop) return fdTop
  if (!raw) return {}
  if (
    raw.fachdetails !== undefined ||
    'situation' in raw ||
    'bereiche' in raw ||
    'breakdown' in raw ||
    'preis_modus' in raw ||
    'preisModus' in raw
  ) {
    return raw
  }
  return { fachdetails: raw }
}

/** Flacht normalisierte Fachdetails für die Anzeige ab. */
export function flattenFachdetailsForDisplay(
  raw: Record<string, unknown> | undefined,
  fdTop?: Record<string, unknown>
): FachdetailDisplayEntry[] {
  const top = funnelDatenTopFromRaw(raw, fdTop)
  const bereiche = Array.isArray(top.bereiche)
    ? (top.bereiche as unknown[]).filter((b): b is string => typeof b === 'string')
    : undefined
  const norm = normalizeFunnelDaten(top, bereiche)
  return Object.entries(norm.fachdetails).map(([configKey, values]) => ({
    configKey,
    values,
  }))
}

export function fachdetailWerte(raw: unknown): string[] {
  if (raw == null) return []
  if (typeof raw === 'string') return raw ? [raw] : []
  if (typeof raw === 'number' || typeof raw === 'boolean') return [String(raw)]
  if (Array.isArray(raw)) {
    return raw.flatMap((x) => fachdetailWerte(x))
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const fdTop = funnelDatenTopFromRaw(o)
    return flattenFachdetailsForDisplay(o, fdTop).flatMap((e) => e.values)
  }
  return []
}

/** Anzeige-Label für einen Fachdetail-Wert (Config-Key z. B. bad, bad_ausstattung). */
export function fachdetailDisplayLabel(configKey: string, value: string): string {
  if (!value) return ''
  const mapped = fachdetailDisplayValue(configKey, value)
  if (mapped !== value) return mapped

  const config = FACHDETAILS_CONFIG[configKey]
  const opt = config?.optionen.find((o) => o.value === value || o.label === value)
  if (opt) return opt.label

  return value
}

/** Bereichs-Label für einen Config-Key (bad_ausstattung → Bad — Ausstattung). */
export function bereichLabelForFachdetailKey(configKey: string): string {
  if (WEBSITE_FACHDETAIL_QUESTION_LABELS[configKey]) {
    return websiteFachdetailQuestionLabel(configKey)
  }
  if (configKey.startsWith('kalkulation_')) {
    return configKey.replace(/^kalkulation_/, '').replace(/_/g, ' ')
  }

  if (configKey === 'bad_ausstattung') return 'Bad — Ausstattung'
  if (configKey === 'elektro_kaputt') return 'Elektrik — Problem'

  const bereich = BEREICHE.find((b) => b.value === configKey)
  if (bereich) return bereich.label

  return BEREICH_LABELS[configKey] ?? configKey
}

/** Prop-Zeile in der Projekt-Übersicht (Frage statt nochmal „Bad“ unter „Bereiche: Bad“). */
export function fachdetailPropLabel(configKey: string, bereiche?: string[]): string {
  const cfg = FACHDETAILS_CONFIG[configKey]
  if (cfg?.frage) {
    return cfg.frage.replace(/\?+\s*$/, '').trim()
  }
  if (WEBSITE_FACHDETAIL_QUESTION_LABELS[configKey]) {
    return websiteFachdetailQuestionLabel(configKey)
  }
  if (configKey === 'projekt_gu') return 'Projektangaben (GU / Umbau)'
  const bereichLabel = bereichLabelForFachdetailKey(configKey)
  if (bereiche?.includes(configKey)) {
    return `${bereichLabel} — Angaben`
  }
  return bereichLabel
}

/** Keine zweite Zeile mit demselben Bereichsnamen wie unter „Bereiche“. */
export function shouldShowFachdetailInProjektUebersicht(
  configKey: string,
  bereiche: string[]
): boolean {
  if (!isKnownFachdetailConfigKey(configKey)) return false
  if (configKey === 'bereiche' || configKey === 'bereiche_sonstiges') return false
  if (!bereiche.includes(configKey)) return true
  return fachdetailPropLabel(configKey, bereiche) !== bereichLabelForFachdetailKey(configKey)
}

export function fachdetailsForProjektUebersicht(
  raw: Record<string, unknown> | undefined,
  bereiche: string[]
): FachdetailDisplayEntry[] {
  return flattenFachdetailsForDisplay(raw)
    .filter((e) => e.values.length > 0)
    .filter((e) => shouldShowFachdetailInProjektUebersicht(e.configKey, bereiche))
}

export function kundentypFunnelLabel(value: string | undefined): string {
  if (!value) return ''
  return KUNDENTYP_OPTIONS.find((k) => k.value === value)?.label ?? value
}

export function groesseDisplay(
  bereich: string,
  wert: number | string,
  einheitOverride?: string | null
): string {
  const g = GROESSEN_CONFIG[bereich]
  const einheit = einheitOverride?.trim() || g?.einheit || ''
  const n = typeof wert === 'number' ? wert : Number(wert)
  if (!Number.isFinite(n)) return '—'
  return `${n} ${einheit}`.trim()
}

/** Zahl aus Website/CRM (8, "12", "12,5"). */
export function parseGroesseWert(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').trim())
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

/** Sub-Keys in Website-`fachdetails.bad` (z. B. badGroesse, bad_m2). */
export function isGroesseFunnelSubKey(key: string): boolean {
  const kl = key.toLowerCase()
  if (kl === 'groesse' || kl === 'größe' || kl === 'm2' || kl === 'm²' || kl === 'qm' || kl === 'size') {
    return true
  }
  if (/(groesse|größe|_m2|m²|flaeche|fläche|squaremeter)/i.test(key)) return true
  for (const b of Object.keys(GROESSEN_CONFIG)) {
    if (kl === `${b}groesse` || kl === `${b}_m2` || kl === `${b}flaeche`) return true
  }
  return false
}

function bereichFromGroesseKey(key: string): string | null {
  if (GROESSEN_CONFIG[key] || BEREICH_LABELS[key]) return key
  const kl = key.toLowerCase()
  for (const b of Object.keys(GROESSEN_CONFIG)) {
    const bl = b.toLowerCase()
    if (kl === bl) return b
    if (kl.startsWith(bl) && isGroesseFunnelSubKey(key)) return b
    if (kl.startsWith(`${bl}_`) && isGroesseFunnelSubKey(key)) return b
  }
  const m = kl.match(/^([a-z_]+?)_(m2|groesse|flaeche|qm)$/)
  if (m && (GROESSEN_CONFIG[m[1]] || BEREICH_LABELS[m[1]])) return m[1]
  return null
}

function mergeGroessen(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) {
    if (Number.isFinite(v) && v > 0) target[k] = v
  }
}

function groessenFromRecord(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const n = parseGroesseWert(val)
    const bereich = bereichFromGroesseKey(key)
    if (n != null && bereich) {
      out[bereich] = n
      continue
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [, subVal] of Object.entries(val as Record<string, unknown>)) {
        const n2 = parseGroesseWert(subVal)
        const b = bereichFromGroesseKey(key)
        if (n2 != null && b) out[b] = n2
      }
    }
  }
  return out
}

function groessenFromFachdetails(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [bereich, details] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof details !== 'object' || details === null || Array.isArray(details)) continue
    const mappedBereich = mapWebsiteGewerkKey(bereich)
    for (const [subKey, subVal] of Object.entries(details as Record<string, unknown>)) {
      if (!isGroesseFunnelSubKey(subKey)) continue
      const n = parseGroesseWert(subVal)
      const b =
        bereichFromGroesseKey(mappedBereich) ??
        bereichFromGroesseKey(bereich) ??
        bereichFromGroesseKey(subKey) ??
        (GROESSEN_CONFIG[mappedBereich] ? mappedBereich : null)
      if (n != null && b) out[b] = n
    }
  }
  return out
}

/** Alle Größen aus funnel_daten (Website + CRM). */
export function collectGroessenFromFunnelDaten(
  fd: Record<string, unknown> | undefined
): Record<string, number> {
  if (!fd) return {}
  const bereiche = Array.isArray(fd.bereiche)
    ? (fd.bereiche as unknown[]).filter((b): b is string => typeof b === 'string')
    : undefined
  const norm = normalizeFunnelDaten(fd, bereiche)
  const out = { ...norm.groessen }

  for (const [key, val] of Object.entries(fd)) {
    if (FUNNEL_META_KEYS.has(key)) continue
    const n = parseGroesseWert(val)
    const bereich = bereichFromGroesseKey(key)
    if (n != null && bereich) out[bereich] = n
  }

  return out
}

/** CRM-Formular → funnel_daten (Fachdetails als string[] pro Config-Key). */
export function buildFunnelDatenFromForm(input: {
  fachdetails: Record<string, string[]>
  groessen: Record<string, number>
  groessen_einheiten?: Record<string, string>
  kundentyp: string
  quelle: string
  extra?: Record<string, unknown>
}): LeadFunnelDaten {
  const fachdetails: Record<string, string[]> = {}
  for (const [k, arr] of Object.entries(input.fachdetails)) {
    if (arr?.length) fachdetails[k] = arr
  }
  const groessen: Record<string, number> = {}
  for (const [k, v] of Object.entries(input.groessen)) {
    if (Number.isFinite(v) && v > 0) groessen[k] = v
  }
  const groessen_einheiten: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.groessen_einheiten ?? {})) {
    if (v?.trim()) groessen_einheiten[k] = v.trim()
  }
  return {
    ...input.extra,
    fachdetails,
    groessen,
    ...(Object.keys(groessen_einheiten).length ? { groessen_einheiten } : {}),
    kundentyp: input.kundentyp,
    quelle: input.quelle,
  }
}

export function parseFunnelFachdetailsArrays(
  raw: unknown
): Record<string, string[]> {
  const parsed = parseLeadFunnelDaten(raw)
  const fd = parsed.fachdetails ?? {}
  const fdTop = parsed as Record<string, unknown>
  const out: Record<string, string[]> = {}
  for (const { configKey, values } of flattenFachdetailsForDisplay(
    fd as Record<string, unknown>,
    fdTop
  )) {
    if (values.length) out[configKey] = values
  }
  return out
}
