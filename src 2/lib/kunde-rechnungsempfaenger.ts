import { kundentypLabel } from '@/lib/lead-display-helpers'
import {
  istKundeGewerbeTyp,
  kundeHausnummer,
  kundeStrasse,
  kundeStrasseHausnummerZeile,
  type KundeStammPick,
} from '@/lib/kunde-stammdaten'
import { normalizeKundeNamen, splitDeutscherVollname } from '@/lib/kunde-namen'
import type { Kunde } from '@/lib/types'

export type KundeAnredeKontext = {
  name: string
  vorname?: string | null
  nachname?: string | null
  ansprechpartner?: string | null
  typ?: string | null
}

/** Vorname für „Hallo …“ — bevorzugt Stammdaten, nicht Firmenname oder Kürzel. */
export function kundeBegruessungsVorname(input: KundeAnredeKontext): string | null {
  const vorname = input.vorname?.trim()
  if (vorname) return vorname

  const ansprechpartner = input.ansprechpartner?.trim()
  if (ansprechpartner) {
    const ausAp = splitDeutscherVollname(ansprechpartner).vorname
    if (ausAp) return ausAp
  }

  const displayName = input.name?.trim()
  if (displayName && !istKundeGewerbeTyp(input.typ)) {
    const ausName = splitDeutscherVollname(displayName).vorname
    if (ausName) return ausName
  }

  if (displayName && istKundeGewerbeTyp(input.typ)) {
    const split = splitDeutscherVollname(displayName)
    if (split.vorname && split.nachname) return split.vorname
  }

  return null
}

/** Begrüßungszeile für Angebots-PDF und -Mail. */
export function kundeAngebotBegruessung(
  anrede: 'du' | 'sie',
  input: KundeAnredeKontext
): string {
  const vorname = kundeBegruessungsVorname(input)
  const nachname = input.nachname?.trim()
  const vollname = [input.vorname?.trim(), nachname].filter(Boolean).join(' ')

  if (anrede === 'sie') {
    if (vollname) return `Guten Tag ${vollname},`
    if (nachname) return `Guten Tag ${nachname},`
    return 'Guten Tag,'
  }

  if (vorname) return `Hallo ${vorname},`
  return 'Guten Tag,'
}

export type KundeStammdatenFallback = {
  plz?: string | null
  kontakt_name?: string | null
  kontakt_email?: string | null
  kontakt_telefon?: string | null
  funnel_daten?: unknown
}

export type KundeRechnungsempfaenger = {
  name: string
  vorname: string | null
  nachname: string | null
  ansprechpartner: string | null
  strasse: string | null
  hausnummer: string | null
  strasseHausnummer: string | null
  plz: string | null
  ort: string | null
  plzOrt: string
  adresseBlock: string
  email: string | null
  telefon: string | null
  typ: string | null
  typLabel: string
  ust_id: string | null
  kundennummer: string | null
  hatStammdaten: boolean
  fehlendeRechnungsfelder: string[]
}

type KundeStammFull = KundeStammPick &
  Pick<Kunde, 'email' | 'telefon' | 'typ' | 'ust_id' | 'ansprechpartner' | 'kundennummer'>

/** Rechnungs-/PDF-Empfänger aus Kunden-Stammdaten (mit minimalen Lead-Fallbacks nur wenn Feld leer). */
export function kundeRechnungsempfaengerAusStammdaten(
  kunde: KundeStammFull | null | undefined,
  fallback?: KundeStammdatenFallback | null
): KundeRechnungsempfaenger {
  const hatStammdaten = Boolean(kunde)
  const norm = kunde
    ? normalizeKundeNamen({
        typ: kunde.typ,
        name: kunde.name,
        vorname: kunde.vorname,
        nachname: kunde.nachname,
        funnelDaten: fallback?.funnel_daten,
        kontaktName: fallback?.kontakt_name,
      })
    : normalizeKundeNamen({
        kontaktName: fallback?.kontakt_name,
        funnelDaten: fallback?.funnel_daten,
      })
  const name = norm.name || fallback?.kontakt_name?.trim() || '—'
  const vorname = norm.vorname
  const nachname = norm.nachname
  const ansprechpartner = kunde?.ansprechpartner?.trim() || null
  const strasse = kunde ? kundeStrasse(kunde) : null
  const hausnummer = kunde ? kundeHausnummer(kunde) : null
  const strasseHausnummer = kunde ? kundeStrasseHausnummerZeile(kunde) : null
  const plz = kunde?.plz?.trim() || fallback?.plz?.trim() || null
  const ort = kunde?.ort?.trim() || null
  const plzOrt = [plz, ort].filter(Boolean).join(' ')
  const adresseZeilen = [ansprechpartner, strasseHausnummer, plzOrt || null].filter(Boolean) as string[]

  const fehlendeRechnungsfelder: string[] = []
  if (!kunde) {
    fehlendeRechnungsfelder.push('Kunden-Stammdatensatz')
  } else {
    if (istKundeGewerbeTyp(kunde.typ)) {
      if (!kunde.name?.trim()) fehlendeRechnungsfelder.push('Firma')
    } else if (!vorname?.trim() && !nachname?.trim()) {
      fehlendeRechnungsfelder.push('Vorname oder Nachname')
    }
    if (!strasse) fehlendeRechnungsfelder.push('Straße')
    if (!hausnummer) fehlendeRechnungsfelder.push('Hausnummer')
    if (!plz?.trim() || !ort?.trim()) fehlendeRechnungsfelder.push('Postleitzahl und Ort')
  }

  return {
    name,
    vorname,
    nachname,
    ansprechpartner,
    strasse,
    hausnummer,
    strasseHausnummer,
    plz,
    ort,
    plzOrt,
    adresseBlock: adresseZeilen.join('\n'),
    email: kunde?.email?.trim() || fallback?.kontakt_email?.trim() || null,
    telefon: kunde?.telefon?.trim() || fallback?.kontakt_telefon?.trim() || null,
    typ: kunde?.typ?.trim() || null,
    typLabel: kundentypLabel(kunde?.typ),
    ust_id: kunde?.ust_id?.trim() || null,
    kundennummer: kunde?.kundennummer?.trim() || null,
    hatStammdaten,
    fehlendeRechnungsfelder,
  }
}

/** Kompaktes { name, adresse } für Angebots-PDF/HTML. */
export function formatKundeEmpfaengerFuerDokument(
  kunde: KundeStammFull,
  leadPlz?: string | null
): { name: string; adresse: string } {
  const emp = kundeRechnungsempfaengerAusStammdaten(kunde, leadPlz ? { plz: leadPlz } : null)
  return { name: emp.name, adresse: emp.adresseBlock || '—' }
}

export function kundeAnredeKontextFromEmpfaenger(
  emp: Pick<
    KundeRechnungsempfaenger,
    'name' | 'vorname' | 'nachname' | 'ansprechpartner' | 'typ'
  >
): KundeAnredeKontext {
  return {
    name: emp.name,
    vorname: emp.vorname,
    nachname: emp.nachname,
    ansprechpartner: emp.ansprechpartner,
    typ: emp.typ,
  }
}
