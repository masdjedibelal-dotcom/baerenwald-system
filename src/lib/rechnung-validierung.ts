import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { kundeHausnummer, kundeStrasse, kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { EINSTELLUNG_KLEINUNTERNEHMER } from '@/lib/rechnung-config'

export type RechnungValidierungInput = {
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  rechnungsdatum: string | null
  positionenCount: number
}

export function validateRechnungPflichtangaben(
  firm: FirmenEinstellungen,
  kunde: Pick<
    Kunde,
    'name' | 'vorname' | 'nachname' | 'adresse' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'typ' | 'ust_id'
  >,
  input: RechnungValidierungInput
): string | null {
  if (!firm.firmenname?.trim()) {
    return 'Firmenname in den Einstellungen fehlt.'
  }
  if (!firm.strasse?.trim() || !firm.plz?.trim() || !firm.ort?.trim()) {
    return 'Vollständige Firmenadresse (Straße, PLZ, Ort) in den Einstellungen fehlt.'
  }
  const klein = parseKleinunternehmerSetting(firm[EINSTELLUNG_KLEINUNTERNEHMER as keyof FirmenEinstellungen] as string)
  if (!klein && !firm.ust_id?.trim() && !firm.steuernummer?.trim()) {
    return 'USt-IdNr. oder Steuernummer der Firma in den Einstellungen fehlt.'
  }

  if (!kundeDisplayName(kunde).trim() || kundeDisplayName(kunde) === '—') {
    return 'Kundenname fehlt (Nachname oder Firma).'
  }
  if (!kundeStrasse(kunde)) return 'Straße fehlt in den Stammdaten.'
  if (!kundeHausnummer(kunde)) return 'Hausnummer fehlt in den Stammdaten.'
  if (!kunde.plz?.trim() || !kunde.ort?.trim()) {
    return 'Postleitzahl und Ort fehlen in den Stammdaten.'
  }

  if (!input.rechnungsdatum?.trim()) return 'Rechnungsdatum fehlt.'
  if (!input.leistungszeitraum_von?.trim() || !input.leistungszeitraum_bis?.trim()) {
    return 'Leistungszeitraum (von und bis) ist Pflichtangabe auf der Rechnung.'
  }
  if (input.positionenCount < 1) {
    return 'Mindestens eine Position erforderlich.'
  }

  return null
}
