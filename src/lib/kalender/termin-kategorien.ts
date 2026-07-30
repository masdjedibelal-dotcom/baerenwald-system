import type { KalenderTermin } from '@/lib/types'

/** UI-/DB-Kategorien für Kalender-Termine (typ ist freier Text in der DB). */
export type TerminKategorie =
  | 'vor_ort'
  | 'kundentermin'
  | 'projekttermin'
  | 'aufmass'
  | 'kundengespraech'
  | 'allgemein'
  | 'sonstiges'
  | 'privat'
  | 'abnahme'

export const TERMIN_KATEGORIE_OPTIONS: {
  value: TerminKategorie
  label: string
}[] = [
  { value: 'vor_ort', label: 'Vor-Ort Termin' },
  { value: 'kundentermin', label: 'Kundentermin' },
  { value: 'projekttermin', label: 'Projekttermin' },
  { value: 'aufmass', label: 'Aufmaß' },
  { value: 'kundengespraech', label: 'Kundengespräch' },
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'sonstiges', label: 'Sonstiges' },
  { value: 'privat', label: 'Privat' },
  { value: 'abnahme', label: 'Abnahme' },
]

/** Kalender-Chip-Farbe (Mock: green / blue / yellow). */
export type TerminKatFarbe = 'green' | 'blue' | 'yellow'

const KAT_FARBE: Record<TerminKategorie, TerminKatFarbe> = {
  vor_ort: 'green',
  aufmass: 'green',
  projekttermin: 'green',
  kundentermin: 'blue',
  kundengespraech: 'blue',
  allgemein: 'blue',
  sonstiges: 'blue',
  privat: 'blue',
  abnahme: 'yellow',
}

/** Legacy-Typen aus älteren Einträgen. */
const LEGACY_TYP_TO_KAT: Record<string, TerminKategorie> = {
  besichtigung: 'vor_ort',
  beginn: 'projekttermin',
  abnahme: 'abnahme',
  sonstiges: 'sonstiges',
  intern: 'privat',
}

export function terminTypToKategorie(typ: string | null | undefined): TerminKategorie {
  const t = (typ ?? '').trim()
  if ((TERMIN_KATEGORIE_OPTIONS as { value: string }[]).some((o) => o.value === t)) {
    return t as TerminKategorie
  }
  return LEGACY_TYP_TO_KAT[t] ?? 'allgemein'
}

export function terminKategorieLabel(kat: TerminKategorie): string {
  return TERMIN_KATEGORIE_OPTIONS.find((o) => o.value === kat)?.label ?? 'Allgemein'
}

export function terminKategorieFarbe(kat: TerminKategorie): TerminKatFarbe {
  return KAT_FARBE[kat]
}

export function terminTypFarbe(typ: KalenderTermin['typ'] | string): TerminKatFarbe {
  return terminKategorieFarbe(terminTypToKategorie(typ))
}

export function formatTerminAdresse(parts: {
  strasse?: string
  hausnummer?: string
  plz?: string
}): string {
  const line1 = [parts.strasse?.trim(), parts.hausnummer?.trim()].filter(Boolean).join(' ').trim()
  const plz = parts.plz?.trim() ?? ''
  if (line1 && plz) return `${line1}, ${plz}`
  return line1 || plz || ''
}

/** Zerlegt gespeicherte Adresszeile grob in Straße/Nr. und PLZ. */
export function parseTerminAdresse(raw: string | null | undefined): {
  strasse: string
  hausnummer: string
  plz: string
} {
  const t = (raw ?? '').trim()
  if (!t) return { strasse: '', hausnummer: '', plz: '' }

  let rest = t
  let plz = ''
  const plzMatch = rest.match(/,?\s*(\d{5})(?:\s+[A-Za-zÄÖÜäöüß.\-\s]+)?\s*$/)
  if (plzMatch) {
    plz = plzMatch[1] ?? ''
    rest = rest.slice(0, plzMatch.index).replace(/,\s*$/, '').trim()
  }

  const nrMatch = rest.match(/^(.*\S)\s+(\d+\s*[a-zA-Z]?)$/)
  if (nrMatch) {
    return { strasse: nrMatch[1]!.trim(), hausnummer: nrMatch[2]!.trim(), plz }
  }
  return { strasse: rest, hausnummer: '', plz }
}
