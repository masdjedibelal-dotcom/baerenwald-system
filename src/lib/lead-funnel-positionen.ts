import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import { neuePositionsId } from '@/lib/angebot-positionen'
import { festpreisMitteAusRange, type WizardPosition } from '@/lib/angebote/angebot-wizard-types'
import { BEREICH_TO_GEWERK } from '@/lib/utils'
import type { Gewerk } from '@/lib/types'

export type LeadFunnelPosition = {
  leistung: string
  menge: number
  einheit: string
  preis_min: number
  preis_max: number
  gewerk_id?: string
  gewerk_slug?: string
  gewerk_name?: string
  /** true = erscheint im Angebot/Rechnung; false = nur Projektdetails */
  relevant_fuer_rechnung?: boolean
}

export const RELEVANZ_RECHNUNG_OPTIONS = [
  { value: 'false', label: 'Nur Projektdetails' },
  { value: 'true', label: 'In Angebot / Rechnung' },
] as const

/** Fehlendes Flag = bisheriges Verhalten (übernehmen ins Angebot). */
export function isRelevantFuerRechnung(pos: LeadFunnelPosition): boolean {
  return pos.relevant_fuer_rechnung !== false
}

const TEXT_GEWERK_RULES: { match: RegExp; slugs: string[] }[] = [
  { match: /bad|sanierung|sanitär|fliesen/i, slugs: ['bad'] },
  { match: /maler|wand|wände|decke|streichen|tapezier|anstrich/i, slugs: ['maler'] },
  { match: /parkett|boden|laminat|vinyl/i, slugs: ['boden'] },
  { match: /elektr/i, slugs: ['elektrik'] },
  { match: /küche|kueche/i, slugs: ['bad', 'elektrik'] },
  { match: /dach|ausbau/i, slugs: ['dach'] },
  { match: /fassade|klinker|backstein|imprägnierung/i, slugs: ['fassade'] },
  { match: /trockenbau|rigips/i, slugs: ['trockenbau'] },
  { match: /fenster/i, slugs: ['fenster'] },
  { match: /heizung|sanitär/i, slugs: ['heizung'] },
  { match: /garten|rasen/i, slugs: ['garten'] },
]

export function resolveGewerkForFunnelPosition(
  pos: LeadFunnelPosition,
  gewerke: Gewerk[],
  bereiche: string[] = []
): Pick<WizardPosition, 'gewerk_id' | 'gewerk_name' | 'gewerk_slug'> {
  const aktiv = gewerke.filter((g) => g.aktiv !== false)
  if (pos.gewerk_id) {
    const g = aktiv.find((x) => x.id === pos.gewerk_id)
    if (g) return { gewerk_id: g.id, gewerk_name: g.name, gewerk_slug: g.slug }
  }
  if (pos.gewerk_slug && pos.gewerk_slug !== 'frei') {
    const g = aktiv.find((x) => x.slug === pos.gewerk_slug)
    if (g) return { gewerk_id: g.id, gewerk_name: g.name, gewerk_slug: g.slug }
  }
  for (const bereich of bereiche) {
    const slug = BEREICH_TO_GEWERK[bereich]
    if (!slug) continue
    const g = aktiv.find((x) => x.slug === slug)
    if (g) return { gewerk_id: g.id, gewerk_name: g.name, gewerk_slug: g.slug }
  }
  const text = pos.leistung.trim()
  for (const rule of TEXT_GEWERK_RULES) {
    if (!rule.match.test(text)) continue
    for (const slug of rule.slugs) {
      const g = aktiv.find((x) => x.slug === slug)
      if (g) return { gewerk_id: g.id, gewerk_name: g.name, gewerk_slug: g.slug }
    }
  }
  return { gewerk_id: '', gewerk_name: 'Freie Leistung', gewerk_slug: 'frei' }
}

export const LEISTUNG_EINHEITEN = ['pauschal', 'm²', 'Stück', 'lfm', 'lfd. m', 'Std.'] as const

export const LEISTUNG_EINHEIT_OPTIONS = LEISTUNG_EINHEITEN.map((e) => ({ value: e, label: e }))

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function parseFunnelPositionen(raw: unknown): LeadFunnelPosition[] {
  const funnel = parseLeadFunnelDaten(raw)
  const list = funnel.positionen
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const leistung = String(r.leistung ?? '').trim()
      if (!leistung) return null
      const gewerk_id = String(r.gewerk_id ?? '').trim()
      const gewerk_slug = String(r.gewerk_slug ?? '').trim()
      const gewerk_name = String(r.gewerk_name ?? '').trim()
      const relRaw = r.relevant_fuer_rechnung
      const relevant_fuer_rechnung =
        relRaw === false || relRaw === 'false'
          ? false
          : relRaw === true || relRaw === 'true'
            ? true
            : undefined
      return {
        leistung,
        menge: Math.max(num(r.menge, 1), 0.01),
        einheit: String(r.einheit ?? 'pauschal').trim() || 'pauschal',
        preis_min: Math.max(num(r.preis_min), 0),
        preis_max: Math.max(num(r.preis_max), 0),
        ...(gewerk_id ? { gewerk_id } : {}),
        ...(gewerk_slug ? { gewerk_slug } : {}),
        ...(gewerk_name ? { gewerk_name } : {}),
        ...(relevant_fuer_rechnung !== undefined ? { relevant_fuer_rechnung } : {}),
      }
    })
    .filter((p): p is LeadFunnelPosition => p != null)
}

export function funnelPositionenGesamt(positionen: LeadFunnelPosition[]) {
  const gesamtMin = positionen.reduce((s, p) => s + p.preis_min * p.menge, 0)
  const gesamtMax = positionen.reduce((s, p) => s + p.preis_max * p.menge, 0)
  return { gesamtMin, gesamtMax }
}

/** Funnel speichert Einheitspreise → Wizard-Zeile mit Zeilensumme */
export function funnelPositionToWizard(
  pos: LeadFunnelPosition,
  gewerke: Gewerk[] = [],
  bereiche: string[] = []
): WizardPosition {
  const menge = Math.max(pos.menge, 0.01)
  const isM2 = pos.einheit === 'm²' || pos.einheit === 'm2'
  const lineMin = isM2 ? Math.round(pos.preis_min * menge) : pos.preis_min
  const lineMax = isM2 ? Math.round(pos.preis_max * menge) : pos.preis_max
  const fest = festpreisMitteAusRange(lineMin, lineMax > 0 ? lineMax : lineMin)
  const gew = resolveGewerkForFunnelPosition(pos, gewerke, bereiche)
  const hatGewerk = Boolean(gew.gewerk_id)
  return {
    id: neuePositionsId(),
    ...gew,
    leistung: pos.leistung,
    beschreibung: pos.leistung,
    menge,
    einheit: pos.einheit,
    preis_min: fest,
    preis_max: fest,
    frei: !hatGewerk,
  }
}

export function neueFreieWizardPosition(): WizardPosition {
  return {
    id: neuePositionsId(),
    gewerk_id: '',
    gewerk_name: 'Freie Leistung',
    gewerk_slug: 'frei',
    leistung: '',
    beschreibung: '',
    menge: 1,
    einheit: 'pauschal',
    preis_min: 0,
    preis_max: 0,
    frei: true,
  }
}
