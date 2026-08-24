import { kundentypLabel } from '@/lib/lead-display-helpers'
import {
  istKundeGewerbeTyp,
  kundeHausnummer,
  kundeStrasse,
  kundeStrasseHausnummerZeile,
  type KundeStammPick,
} from '@/lib/kunde-stammdaten'
import { normalizeKundeNamen, splitDeutscherVollname } from '@/lib/kunde-namen'
import {
  kundenObjektHatAnschrift,
  kundenObjektStrasseZeile,
} from '@/lib/kunden-objekte'
import type { Kunde, KundeAnsprechpartner, KundenObjekt } from '@/lib/types'

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
  Pick<Kunde, 'email' | 'telefon' | 'typ' | 'ust_id' | 'ansprechpartner' | 'kundennummer'> & {
    kunden_ansprechpartner?: KundeAnsprechpartner[] | null
  }

/**
 * Personenzeile unter der Firma auf PDF/Rechnung.
 * selectedId (Wizard) > Primär in der Liste > Stammdaten Vor+Nach (ohne Legacy-Motzi).
 */
export function resolveKundeDokumentAnsprechpartner(
  kunde: KundeStammFull | null | undefined,
  opts?: { selectedId?: string | null }
): string | null {
  if (!kunde) return null

  const list = Array.isArray(kunde.kunden_ansprechpartner)
    ? kunde.kunden_ansprechpartner
    : null
  const selectedId = opts?.selectedId?.trim() || null

  if (list && selectedId) {
    const picked = list.find((a) => a.id === selectedId && String(a.name ?? '').trim())
    if (picked) return String(picked.name).trim()
  }

  if (list) {
    const primary = list.find((a) => a.ist_primaer && String(a.name ?? '').trim())
    if (primary) return String(primary.name).trim()

    // Liste geladen, keiner primär / Auswahl leer → Stammdaten, Legacy ignorieren
    const stamm = [kunde.vorname?.trim(), kunde.nachname?.trim()].filter(Boolean).join(' ')
    return stamm || null
  }

  const legacy = kunde.ansprechpartner?.trim() || null
  if (legacy) return legacy

  if (istKundeGewerbeTyp(kunde.typ)) {
    const stamm = [kunde.vorname?.trim(), kunde.nachname?.trim()].filter(Boolean).join(' ')
    return stamm || null
  }
  return null
}

/** Kontakt für Empfängerzeile, Anrede und Mail — Wizard-Auswahl hat Vorrang. */
export function resolveRechnungEmpfaengerKontakt(
  kunde: KundeStammFull | null | undefined,
  selectedId?: string | null
): {
  personName: string | null
  vorname: string | null
  nachname: string | null
  email: string | null
  telefon: string | null
  ansprechpartnerId: string | null
} {
  const list = Array.isArray(kunde?.kunden_ansprechpartner)
    ? kunde!.kunden_ansprechpartner!
    : []
  const sid = selectedId?.trim() || null
  const picked =
    (sid ? list.find((a) => a.id === sid) : null) ??
    list.find((a) => a.ist_primaer) ??
    null

  if (picked) {
    const split = splitDeutscherVollname(String(picked.name ?? '').trim())
    return {
      personName: String(picked.name ?? '').trim() || null,
      vorname: split.vorname,
      nachname: split.nachname,
      email: picked.email?.trim() || kunde?.email?.trim() || null,
      telefon: picked.telefon?.trim() || kunde?.telefon?.trim() || null,
      ansprechpartnerId: picked.id,
    }
  }

  const personName = resolveKundeDokumentAnsprechpartner(kunde, { selectedId: null })
  return {
    personName,
    vorname: kunde?.vorname?.trim() || null,
    nachname: kunde?.nachname?.trim() || null,
    email: kunde?.email?.trim() || null,
    telefon: kunde?.telefon?.trim() || null,
    ansprechpartnerId: null,
  }
}

/** Rechnungs-/PDF-Empfänger aus Kunden-Stammdaten (mit minimalen Lead-Fallbacks nur wenn Feld leer). */
export function kundeRechnungsempfaengerAusStammdaten(
  kunde: KundeStammFull | null | undefined,
  fallback?: KundeStammdatenFallback | null,
  opts?: { selectedAnsprechpartnerId?: string | null }
): KundeRechnungsempfaenger {
  const hatStammdaten = Boolean(kunde)
  const kontakt = resolveRechnungEmpfaengerKontakt(
    kunde,
    opts?.selectedAnsprechpartnerId
  )
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
  /** Anrede: gewählter AP, sonst Stammdaten */
  const vorname = kontakt.ansprechpartnerId ? kontakt.vorname : norm.vorname
  const nachname = kontakt.ansprechpartnerId ? kontakt.nachname : norm.nachname
  const ansprechpartner = kontakt.personName
  const strasse = kunde ? kundeStrasse(kunde) : null
  const hausnummer = kunde ? kundeHausnummer(kunde) : null
  const strasseHausnummer = kunde ? kundeStrasseHausnummerZeile(kunde) : null
  const plz = kunde?.plz?.trim() || fallback?.plz?.trim() || null
  const ort = kunde?.ort?.trim() || null
  const plzOrt = [plz, ort].filter(Boolean).join(' ')
  const adresseZeilen = [ansprechpartner, strasseHausnummer, plzOrt || null].filter(
    Boolean
  ) as string[]

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
    email: kontakt.email || fallback?.kontakt_email?.trim() || null,
    telefon: kontakt.telefon || fallback?.kontakt_telefon?.trim() || null,
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
  leadPlz?: string | null,
  opts?: { selectedAnsprechpartnerId?: string | null }
): { name: string; adresse: string } {
  const emp = kundeRechnungsempfaengerAusStammdaten(
    kunde,
    leadPlz ? { plz: leadPlz } : null,
    opts
  )
  return { name: emp.name, adresse: emp.adresseBlock || '—' }
}

/** Rechnungsname der WEG/des Objekts (Titel, sonst „WEG …“ aus Anschrift). */
export function resolveWegRechnungsname(objekt: KundenObjekt): string {
  const titel = objekt.titel?.trim() || ''
  const str = kundenObjektStrasseZeile(objekt)
  const po = [objekt.plz?.trim(), objekt.ort?.trim()].filter(Boolean).join(' ')
  /** Nur „WEG“ / leer → Anschrift ergänzen, sonst steht nichts Aussagekräftiges. */
  const titelIstNurWeg = !titel || /^weg\.?$/i.test(titel)

  if (!titelIstNurWeg) return titel
  if (str) return `WEG ${str}`
  if (po) return `WEG ${po}`
  return titel || 'WEG'
}

/**
 * Rechnungs-Empfängerblock:
 * - Mit Objekt (WEG): Name = WEG/Objekt; Adresse = c/o HV + z. Hd. AP + HV-Büroadresse.
 * - Ohne Objekt: klassische HV-/Kundenadresse.
 */
export function formatRechnungEmpfaengerFuerDokument(
  kunde: KundeStammFull,
  opts?: {
    selectedAnsprechpartnerId?: string | null
    objekt?: KundenObjekt | null
  }
): { name: string; adresse: string } {
  const objekt = opts?.objekt ?? null
  const hatObjekt = Boolean(objekt && (objekt.titel?.trim() || kundenObjektHatAnschrift(objekt)))

  if (!hatObjekt || !objekt) {
    return formatKundeEmpfaengerFuerDokument(kunde, null, {
      selectedAnsprechpartnerId: opts?.selectedAnsprechpartnerId,
    })
  }

  const kontakt = resolveRechnungEmpfaengerKontakt(
    kunde,
    opts?.selectedAnsprechpartnerId
  )
  const hvName =
    normalizeKundeNamen({
      typ: kunde.typ,
      name: kunde.name,
      vorname: kunde.vorname,
      nachname: kunde.nachname,
    }).name.trim() ||
    kunde.name?.trim() ||
    'Hausverwaltung'

  const lines: string[] = [`c/o ${hvName}`]
  const ap = kontakt.personName?.trim()
  if (ap) lines.push(`z. Hd. ${ap}`)

  const hvStrasse = kundeStrasseHausnummerZeile(kunde)
  if (hvStrasse) lines.push(hvStrasse)
  const hvPlzOrt = [kunde.plz?.trim(), kunde.ort?.trim()].filter(Boolean).join(' ')
  if (hvPlzOrt) lines.push(hvPlzOrt)

  return {
    name: resolveWegRechnungsname(objekt),
    adresse: lines.join('\n') || '—',
  }
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
