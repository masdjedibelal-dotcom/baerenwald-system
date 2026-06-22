import { neuePositionsId } from '@/lib/angebot-positionen'
import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import { isMengeEinheitMengeMalEinheitspreis } from '@/lib/dokument-einheiten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import type { Gewerk, Lead, Preisliste } from '@/lib/types'
import { BEREICH_LABELS, BEREICH_TO_GEWERK, FACHDETAIL_TO_LEISTUNG } from '@/lib/utils'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
import type { WizardPosition } from '@/lib/angebote/angebot-wizard-types'
import { funnelPositionToWizard } from '@/lib/lead-funnel-positionen'
import { parseProjektWasZeilen, wasZeilenToFunnelPositionen } from '@/lib/lead-projekt-was'

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

/** Einzelpreis netto aus der Preisliste (z. B. €/m²), nicht Zeilensumme. */
export function preislisteEinheitspreisNetto(pl: Preisliste): number {
  return preislisteEinzelpreis(pl)
}

function wizardRowFromPreisliste(
  g: Gewerk,
  pl: Preisliste,
  menge: number,
  beschreibung: string,
  einheitOverride?: string | null
): WizardPosition {
  const unit = preislisteEinzelpreis(pl)
  const m = Math.max(menge, 0.01)
  const einheit = einheitOverride?.trim() || pl.einheit
  const fest = isMengeEinheitMengeMalEinheitspreis(einheit)
    ? Math.round(unit * m * 100) / 100
    : unit
  return {
    id: neuePositionsId(),
    gewerk_id: g.id,
    gewerk_name: g.name,
    gewerk_slug: g.slug,
    leistung: pl.leistung,
    beschreibung: beschreibung || pl.leistung,
    menge,
    einheit,
    preis_min: fest,
    preis_max: fest,
    preisliste_id: pl.id,
  }
}

/** Fallback wie Mock: Projekt-Text → Gewerke aus Preisliste */
const PROJECT_MATCH_RULES: { match: RegExp; slugs: string[] }[] = [
  { match: /bad|sanierung|sanitär|fliesen/i, slugs: ['bad', 'maler'] },
  { match: /maler|wand|decke|streichen|tapezier|anstrich/i, slugs: ['maler'] },
  { match: /parkett|boden|laminat|vinyl/i, slugs: ['boden'] },
  { match: /elektr/i, slugs: ['elektrik'] },
  { match: /küche|kueche/i, slugs: ['bad', 'elektrik'] },
  { match: /dach|ausbau|fassade/i, slugs: ['dach', 'fassade', 'maler'] },
]

function fallbackFromProjectText(
  projectText: string,
  gewerke: Gewerk[],
  preislisten: Preisliste[]
): WizardPosition[] {
  const rule = PROJECT_MATCH_RULES.find((r) => r.match.test(projectText))
  if (!rule) return []
  const out: WizardPosition[] = []
  for (const slug of rule.slugs) {
    const g = gewerke.find((x) => x.slug === slug && x.aktiv)
    if (!g) continue
    const pool = preislisten.filter((p) => p.gewerk_id === g.id && p.aktiv)
    for (const pl of pool.slice(0, 2)) {
      const menge = pl.einheit === 'm²' || pl.einheit === 'm2' ? 20 : 1
      out.push(wizardRowFromPreisliste(g, pl, menge, pl.leistung))
    }
  }
  return out
}

export function angebotWizardPositionenFromLead(
  lead: Lead,
  gewerke: Gewerk[],
  preislisten: Preisliste[]
): WizardPosition[] {
  const funnel = parseLeadFunnelDaten(lead.funnel_daten)
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  const wasZeilen = parseProjektWasZeilen(lead.funnel_daten, {
    bereiche: lead.bereiche,
    situation: lead.situation,
    gewerke,
  })
  const fromAnfrage = wasZeilenToFunnelPositionen(wasZeilen).map((p) =>
    funnelPositionToWizard(p, gewerke, bereiche)
  )
  const situation = lead.situation ?? ''
  const fachdetails = funnel.fachdetails ?? {}
  const groessen = funnel.groessen ?? {}
  const groessenEinheiten =
    (funnel.groessen_einheiten as Record<string, string> | undefined) ?? {}
  const positionen: WizardPosition[] = []

  for (const bereich of bereiche) {
    const slug = BEREICH_TO_GEWERK[bereich]
    if (!slug) continue
    const g = gewerke.find((x) => x.slug === slug && x.aktiv)
    if (!g) continue

    const fdList = fachdetails[bereich]
    const fd = Array.isArray(fdList) ? fdList[0] ?? '' : String(fdList ?? '')
    const mapKey = fd ? `${bereich}.${fd}` : ''
    const leistungHint =
      (mapKey && FACHDETAIL_TO_LEISTUNG[mapKey]) ||
      (bereich === 'elektrik' && (situation === 'kaputt' || situation === 'notfall')
        ? FACHDETAIL_TO_LEISTUNG[`elektrik.${fd}`]
        : undefined)

    const pl = findPreisliste(g.id, leistungHint, preislisten)
    if (!pl) continue

    const groesseRaw = groessen[bereich]
    const groesseEinheit = groessenEinheiten[bereich]?.trim() || null
    const menge =
      groesseRaw !== '' && groesseRaw != null && !Number.isNaN(Number(groesseRaw))
        ? Math.max(Number(groesseRaw), 0.01)
        : isMengeEinheitMengeMalEinheitspreis(pl.einheit)
          ? 20
          : 1

    const beschreibung = (leistungHint ?? pl.leistung).trim()
    positionen.push(
      wizardRowFromPreisliste(g, pl, menge, beschreibung, groesseEinheit ?? pl.einheit)
    )
  }

  if (positionen.length || fromAnfrage.length) {
    return [...fromAnfrage, ...positionen]
  }

  const projektLabel = bereiche.length
    ? bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
    : lead.situation ?? 'Projekt'

  const fallback = fallbackFromProjectText(projektLabel, gewerke, preislisten)
  return [...fromAnfrage, ...fallback]
}

/** Gewerke mit mindestens einer aktiven Preisliste — für Dropdown */
export function gewerkeMitPreisliste(gewerke: Gewerk[], preislisten: Preisliste[]): Gewerk[] {
  const ids = new Set(preislisten.filter((p) => p.aktiv).map((p) => p.gewerk_id))
  return gewerke.filter((g) => g.aktiv && ids.has(g.id))
}
