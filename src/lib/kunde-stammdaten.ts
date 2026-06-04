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

/** Anzeige- und Listenname: Firma oder „Vorname Nachname“. */
export function kundeDisplayName(k: KundeStammPick): string {
  const firma = k.name?.trim()
  const person = [k.vorname?.trim(), k.nachname?.trim()].filter(Boolean).join(' ')
  if (istKundeFirmaPflichtTyp(k.typ)) return firma || person || '—'
  if (person) return person
  return firma || '—'
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
  const firma = input.name?.trim() ?? ''
  const person = [input.vorname?.trim(), input.nachname?.trim()].filter(Boolean).join(' ')
  if (istKundeFirmaPflichtTyp(input.typ)) return firma || person
  return person || firma
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

export function validateKundeStammPflicht(input: SaveKundeStammInput): string | null {
  const typ = input.typ
  if (istKundeFirmaPflichtTyp(typ)) {
    if (!input.name?.trim()) {
      return istKundeHausverwaltungTyp(typ) ? 'Firma ist Pflicht.' : 'Firmenname ist Pflicht.'
    }
  } else {
    if (!input.vorname?.trim() && !input.nachname?.trim()) {
      return 'Vorname oder Nachname ist Pflicht.'
    }
  }
  if (!input.strasse?.trim()) return 'Straße ist Pflicht.'
  if (!input.hausnummer?.trim()) return 'Hausnummer ist Pflicht.'
  if (!input.plz?.trim() || !input.ort?.trim()) return 'Postleitzahl und Ort sind Pflicht.'
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
  const strasse = input.strasse?.trim() || null
  const hausnummer = input.hausnummer?.trim() || null
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
