/**
 * HV-Einstellungen: Sofortmaßnahme-Fälle (Auswahl).
 * Parität Website `baerenwald/src/lib/org/sofortmassnahme-faelle.ts`.
 * Leere HV-Liste = nichts geht direkt (kein System-Default).
 */

export type AkutFallId =
  | 'wasser_laeuft'
  | 'wasser_decke_wand'
  | 'wasser_gefahr'
  | 'strom_kein'
  | 'strom_fi_wieder'
  | 'heizung_wohnung_kalt'
  | 'heizung_kein_warmwasser'
  | 'heizung_wasser_hk'
  | 'dach_undicht'
  | 'dach_rinne_akut'
  | 'fenster_scheibe'
  | 'fenster_schloss'
  | 'fenster_tuer_nicht_absperrbar'

export type SofortmassnahmeFall = {
  id: AkutFallId
  bereich: string
  label: string
}

export type SofortmassnahmeFaelleGruppe = {
  bereich: string
  faelle: readonly SofortmassnahmeFall[]
}

export const SOFORTMASSNAHME_FAELLE_KATALOG: readonly SofortmassnahmeFall[] = [
  {
    id: 'wasser_laeuft',
    bereich: 'Wasser',
    label: 'Wasser läuft oder tritt stark aus',
  },
  {
    id: 'wasser_decke_wand',
    bereich: 'Wasser',
    label: 'Wasser aus Decke/Wand, solange es nicht klar gestoppt ist',
  },
  {
    id: 'wasser_gefahr',
    bereich: 'Wasser',
    label: 'Rutschgefahr oder Strom betroffen',
  },
  {
    id: 'strom_kein',
    bereich: 'Strom',
    label: 'Kein Strom in der Wohnung',
  },
  {
    id: 'strom_fi_wieder',
    bereich: 'Strom',
    label: 'FI-/Sicherung fliegt wieder raus',
  },
  {
    id: 'heizung_wohnung_kalt',
    bereich: 'Heizung',
    label: 'Ganze Wohnung kalt',
  },
  {
    id: 'heizung_kein_warmwasser',
    bereich: 'Heizung',
    label: 'Kein Warmwasser',
  },
  {
    id: 'heizung_wasser_hk',
    bereich: 'Heizung',
    label: 'Wasser am Heizkörper läuft noch',
  },
  {
    id: 'dach_undicht',
    bereich: 'Dach',
    label: 'Dach undicht',
  },
  {
    id: 'dach_rinne_akut',
    bereich: 'Dach',
    label: 'Rinne, Fassade oder Ziegel — akut bei Regen / gerade eben',
  },
  {
    id: 'fenster_scheibe',
    bereich: 'Fenster & Tür',
    label: 'Scheibe kaputt',
  },
  {
    id: 'fenster_schloss',
    bereich: 'Fenster & Tür',
    label: 'Schloss / Schlüssel',
  },
  {
    id: 'fenster_tuer_nicht_absperrbar',
    bereich: 'Fenster & Tür',
    label: 'Wohnungs- oder Haustür nicht absperrbar',
  },
] as const

export const ALL_AKUT_FALL_IDS: readonly AkutFallId[] =
  SOFORTMASSNAHME_FAELLE_KATALOG.map((f) => f.id)

const FALL_BY_ID = new Map(
  SOFORTMASSNAHME_FAELLE_KATALOG.map((f) => [f.id, f] as const)
)

export function isAkutFallId(value: string): value is AkutFallId {
  return FALL_BY_ID.has(value as AkutFallId)
}

export function normalizeAkutFallIds(raw: unknown): AkutFallId[] {
  if (!Array.isArray(raw)) return []
  const out: AkutFallId[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const id = String(item ?? '').trim()
    if (!isAkutFallId(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function akutFallIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export function akutFallLabel(id: string): string {
  return FALL_BY_ID.get(id as AkutFallId)?.label ?? id
}

/** Katalog gruppiert (für „Hinzufügen“-UI). */
export function sofortmassnahmeFaelleGruppen(): SofortmassnahmeFaelleGruppe[] {
  const order: string[] = []
  const byBereich = new Map<string, SofortmassnahmeFall[]>()
  for (const f of SOFORTMASSNAHME_FAELLE_KATALOG) {
    if (!byBereich.has(f.bereich)) {
      order.push(f.bereich)
      byBereich.set(f.bereich, [])
    }
    byBereich.get(f.bereich)!.push(f)
  }
  return order.map((bereich) => ({
    bereich,
    faelle: byBereich.get(bereich) ?? [],
  }))
}

export const SOFORTMASSNAHME_FAELLE_FOOTNOTE =
  'Schimmel und sonstige Meldungen laufen immer über Angebot und Freigabe.' as const

export const SOFORTMASSNAHME_FAELLE_INTRO =
  'Nur die hier hinzugefügten Fälle werden bei aktiver Direktbeauftragung ohne Freigabe weitergeleitet. Die Liste startet leer — dann geht nichts direkt.' as const

export const SOFORTMASSNAHME_FAELLE_POPUP_TITLE = 'Fälle hinzufügen' as const
