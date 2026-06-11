import type { RechnungArt } from '@/lib/rechnungen/zahlungsplan'
import type { Zahlungsplan } from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition, Kunde, RechnungStatus } from '@/lib/types'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import {
  defaultRechnungEinleitung,
  defaultRechnungHinweise,
} from '@/lib/rechnungen/rechnung-texte'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

export type RechnungWizardMeta = {
  einleitung: string
  hinweise: string
  mail_einleitung: string
  mail_betreff: string
  reverse_charge_13b: boolean
  rechnungsdatum: string
  leistungszeitraum_von: string
  leistungszeitraum_bis: string
  faellig_am: string
}

export type RechnungWizardAbschlagKontext = {
  zeileId: string
  zeileIndex: number
  zeileTitel: string
  rechnungArt: RechnungArt
  istSchluss: boolean
  gesamtNetto: number
  gesamtBrutto: number
  bereitsGestelltBrutto: number
}

export type RechnungWizardBootstrap = {
  rechnungId: string | null
  rechnungsnummer: string | null
  auftragId: string
  angebotId: string | null
  kundeId: string
  kunde: Pick<
    Kunde,
    | 'id'
    | 'name'
    | 'vorname'
    | 'nachname'
    | 'email'
    | 'telefon'
    | 'adresse'
    | 'strasse'
    | 'hausnummer'
    | 'plz'
    | 'ort'
    | 'typ'
    | 'ust_id'
    | 'kundennummer'
  > | null
  positionen: AngebotPosition[]
  meta: RechnungWizardMeta
  auftragsReferenz: string
  projektTitel?: string | null
  modus?: 'voll' | 'abschlag'
  abschlag?: RechnungWizardAbschlagKontext | null
  zahlungsplan?: Zahlungsplan | null
  zahlungsplanBearbeiten?: boolean
}

export function rechnungDarfImWizardBearbeitetWerden(status: string): boolean {
  return status === 'entwurf'
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function defaultZahlungszielTage(kundeTyp?: string | null): number {
  return istPrivatKundeTyp(kundeTyp) ? 14 : 30
}

export function defaultRechnungWizardMeta(
  zahlungszielTage: number,
  opts?: {
    rechnungsdatum?: string
    leistungszeitraum_von?: string | null
    leistungszeitraum_bis?: string | null
    projektTitel?: string | null
    kundeTyp?: string | null
  }
): RechnungWizardMeta {
  const heute = opts?.rechnungsdatum ?? new Date().toISOString().slice(0, 10)
  const von = opts?.leistungszeitraum_von?.trim() || heute
  const bis = opts?.leistungszeitraum_bis?.trim() || heute
  const anrede: AngebotMailAnrede = istPrivatKundeTyp(opts?.kundeTyp) ? 'du' : 'sie'
  const einleitung = defaultRechnungEinleitung(anrede)
  const hinweise = defaultRechnungHinweise()

  return {
    einleitung,
    hinweise,
    mail_einleitung: '',
    mail_betreff: '',
    reverse_charge_13b: false,
    rechnungsdatum: heute,
    leistungszeitraum_von: von,
    leistungszeitraum_bis: bis,
    faellig_am: addDaysYmd(heute, zahlungszielTage),
  }
}

export type RechnungAuswahlZeile = {
  id: string
  rechnungsnummer: string
  status: RechnungStatus | string
  brutto: number | null
  rechnungsdatum: string | null
  faellig_am: string | null
  pdf_url?: string | null
  gesendet_at?: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  zahlungsplan_abschlag_id?: string | null
}
