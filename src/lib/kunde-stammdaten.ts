import type { Kunde } from '@/lib/types'

export type KundeStammPick = Pick<
  Kunde,
  | 'name'
  | 'vorname'
  | 'nachname'
  | 'adresse'
  | 'strasse'
  | 'hausnummer'
  | 'plz'
  | 'ort'
  | 'typ'
>

/** Minimalfelder für Listen- und Suchanzeige (Firma vor Ansprechpartner). */
export type KundeListenNamePick = {
  name?: string | null
  vorname?: string | null
  nachname?: string | null
  typ?: string | null
}

export function istKundeHausverwaltungTyp(typ: string | null | undefined): boolean {
  const t = (typ ?? '').toLowerCase()
  return t === 'hausverwaltung' || t === 'verwaltung'
}

/** Nur Gewerbe / Gastro (ohne Hausverwaltung). */
export function istKundeNurGewerbeTyp(typ: string | null | undefined): boolean {
  return (typ ?? '').toLowerCase() === 'gewerbe'
}

/** Gewerbe oder Hausverwaltung (Objekte, B2B-Zahlungsbedingungen, …). */
export function istKundeGewerbeTyp(typ: string | null | undefined): boolean {
  return istKundeNurGewerbeTyp(typ) || istKundeHausverwaltungTyp(typ)
}

/** Firma / Name in Stammdaten Pflicht (Gewerbe + Hausverwaltung). */
export function istKundeFirmaPflichtTyp(typ: string | null | undefined): boolean {
  return istKundeGewerbeTyp(typ)
}

/** Anzeige- und Listenname: Firmenname (Feld `name`) vor Ansprechpartner. */
export function kundeDisplayName(k: KundeListenNamePick): string {
  const firma = k.name?.trim()
  if (firma) return firma
  const person = [k.vorname?.trim(), k.nachname?.trim()].filter(Boolean).join(' ')
  return person || '—'
}

export function kundeStrasse(k: KundeStammPick): string | null {
  return k.strasse?.trim() || k.adresse?.trim() || null
}

export function kundeHausnummer(k: KundeStammPick): string | null {
  return k.hausnummer?.trim() || null
}

/** Straße + Hausnummer in einer Zeile (Rechnung/PDF). */
export function kundeStrasseHausnummerZeile(k: KundeStammPick): string | null {
  const str = kundeStrasse(k)
  const nr = kundeHausnummer(k)
  if (str && nr) return `${str} ${nr}`
  return str || nr || null
}

/** Denormalisiertes adresse-Feld für Alt-Code / Export. */
export function kundeAdresseLegacy(k: KundeStammPick): string | null {
  return kundeStrasseHausnummerZeile(k)
}

export function computeKundeNameField(input: {
  typ: string
  name?: string | null
  vorname?: string | null
  nachname?: string | null
}): string {
  void input.typ
  const firma = input.name?.trim() ?? ''
  const person = [input.vorname?.trim(), input.nachname?.trim()].filter(Boolean).join(' ')
  if (firma) return firma
  return person
}

export type SaveKundeStammInput = {
  typ: string
  name?: string | null
  vorname?: string | null
  nachname?: string | null
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
}

/** Trennt „Musterstraße 12a“ in Straße und Hausnummer (Legacy-Adressen). */
export function splitStrasseHausnummer(raw: string): { strasse: string; hausnummer: string | null } {
  const input = raw.trim()
  if (!input) return { strasse: '', hausnummer: null }
  const m = input.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:-\d+[a-zA-Z]?)?)$/)
  if (!m) return { strasse: input, hausnummer: null }
  const strasse = m[1].trim()
  const hausnummer = m[2].trim()
  if (!strasse || !hausnummer) return { strasse: input, hausnummer: null }
  return { strasse, hausnummer }
}

export function initKundeStammEditFelder(k: Pick<Kunde, 'strasse' | 'hausnummer' | 'adresse'>): {
  strasse: string
  hausnummer: string
} {
  const nr = k.hausnummer?.trim() || ''
  if (nr) {
    return {
      strasse: (k.strasse?.trim() || k.adresse?.trim() || '').trim(),
      hausnummer: nr,
    }
  }
  const split = splitStrasseHausnummer(k.strasse?.trim() || k.adresse?.trim() || '')
  return { strasse: split.strasse, hausnummer: split.hausnummer ?? '' }
}

export function normalizeSaveKundeStammInput(input: SaveKundeStammInput): SaveKundeStammInput {
  if (input.hausnummer?.trim()) return input
  const strasse = input.strasse?.trim() || ''
  if (!strasse) return input
  const split = splitStrasseHausnummer(strasse)
  if (!split.hausnummer) return input
  return { ...input, strasse: split.strasse, hausnummer: split.hausnummer }
}

export function validateKundeStammPflicht(input: SaveKundeStammInput): string | null {
  const data = normalizeSaveKundeStammInput(input)
  const typ = data.typ
  if (istKundeFirmaPflichtTyp(typ)) {
    if (!data.name?.trim()) {
      return istKundeHausverwaltungTyp(typ) ? 'Firma ist Pflicht.' : 'Firmenname ist Pflicht.'
    }
  } else {
    if (!data.vorname?.trim() && !data.nachname?.trim()) {
      return 'Vorname oder Nachname ist Pflicht.'
    }
  }
  if (!data.strasse?.trim()) return 'Straße ist Pflicht.'
  if (!data.hausnummer?.trim()) return 'Hausnummer ist Pflicht.'
  if (!data.plz?.trim() || !data.ort?.trim()) return 'Postleitzahl und Ort sind Pflicht.'
  return null
}

export function buildKundeStammDbPayload(input: SaveKundeStammInput): {
  name: string
  vorname: string | null
  nachname: string | null
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
  adresse: string | null
} {
  const normalized = normalizeSaveKundeStammInput(input)
  const strasse = normalized.strasse?.trim() || null
  const hausnummer = normalized.hausnummer?.trim() || null
  const plz = input.plz?.trim() || null
  const ort = input.ort?.trim() || null
  const vorname = input.vorname?.trim() || null
  const nachname = input.nachname?.trim() || null
  const name = computeKundeNameField({
    typ: input.typ,
    name: input.name,
    vorname,
    nachname,
  })
  const adresse = [strasse, hausnummer].filter(Boolean).join(' ') || null
  return { name, vorname, nachname, strasse, hausnummer, plz, ort, adresse }
}
