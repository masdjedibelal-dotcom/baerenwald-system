import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragPosition, Handwerker } from '@/lib/types'

export type HandwerkerVertragTyp = 'projekt' | 'rahmen'

export type HandwerkerVertragDokumentArt = 'hauptvertrag' | 'ergaenzung'

export type HandwerkerVertragStatus = 'entwurf' | 'pdf_erzeugt' | 'unterschrieben'

/** Bearbeitbare Position im Nachtrag-Wizard */
export type NachtragPositionDraft = {
  /** Bestehende auftrag_positionen.id oder `neu-*` */
  id: string
  quelle: 'bestehend' | 'neu'
  leistung_name: string
  einheit: string | null
  menge: number | null
  preis_partner: number | null
  gewerk_name: string
}

export type HandwerkerVertragRow = {
  id: string
  typ: HandwerkerVertragTyp
  vertrags_nr: string
  status: HandwerkerVertragStatus
  auftrag_id: string | null
  handwerker_id: string
  gewerk_id: string | null
  gewerk_name: string | null
  bauvorhaben: string | null
  leistungsumfang: string | null
  verguetung_text: string | null
  regiesatz_netto: number | null
  einbehalt_prozent: number
  zahlungsziel_tage: number
  aufmass_rhythmus_tage: number
  pdf_url: string | null
  signiert_am: string | null
  portal_akzeptiert_am?: string | null
  portal_akzeptiert_auth_user_id?: string | null
  notizen: string | null
  parent_vertrag_id?: string | null
  dokument_art?: HandwerkerVertragDokumentArt
  dokument_titel?: string | null
  bezug_vertrag_vom?: string | null
  bezug_vertrags_nr?: string | null
  vertrag_vom?: string | null
  nachtrag_positionen?: NachtragPositionDraft[] | null
  created_at: string
  updated_at: string
}

export type VertragHandwerkerSnapshot = Pick<
  Handwerker,
  'id' | 'name' | 'firma' | 'adresse' | 'telefon' | 'email' | 'steuernummer' | 'ustid'
>

export type ProjektVertragWizardMeta = {
  handwerker_id: string
  gewerk_id: string | null
  gewerk_name: string
  bauvorhaben: string
  leistungsumfang: string
  verguetung_text: string
  regiesatz_netto: number | null
  einbehalt_prozent: number
  zahlungsziel_tage: number
  aufmass_rhythmus_tage: number
  notizen: string
  /** Nur Nachtrag-Wizard */
  nachtrag_positionen?: NachtragPositionDraft[]
}

export type NachtragWizardContext = {
  parent_vertrag_id: string
  parent_vertrags_nr: string | null
  parent_vertrag_vom: string | null
  parent_leistungsumfang: string
  parent_verguetung_text: string
}

export type CompliancePoolItem = {
  slug: string
  bezeichnung: string
  beschreibung: string | null
  default_pflicht: boolean
}

export type HandwerkerAcceptWizardContext = {
  zuweisung_id: string
  compliance_pool: CompliancePoolItem[]
  initial_compliance_slugs: string[]
}

export type ProjektVertragWizardBootstrap = {
  auftrag_id: string
  auftrag_titel: string
  vertrag_id: string | null
  vertrags_nr: string | null
  meta: ProjektVertragWizardMeta
  handwerker_optionen: VertragHandwerkerSnapshot[]
  gewerk_optionen: { id: string; name: string }[]
  positionen: AuftragPosition[]
  kunde_adresse: string | null
  kunde_plz: string | null
  kunde_ort: string | null
  firm: FirmenEinstellungen
  /** Nach „Annehmen“: Partner/Gewerk gesperrt, Unterlagen-Schritt aktiv */
  accept_mode?: HandwerkerAcceptWizardContext
  /** Ergänzungsvereinbarung zu bestehendem Projektvertrag */
  nachtrag_mode?: NachtragWizardContext
}

export type RahmenVertragWizardBootstrap = {
  handwerker_id: string
  vertrag_id: string | null
  vertrags_nr: string | null
  handwerker: VertragHandwerkerSnapshot
  firm: FirmenEinstellungen
  notizen: string
}

export type VertragPdfPayload = {
  typ: HandwerkerVertragTyp
  vertrags_nr: string
  bauvorhaben?: string | null
  gewerk_name?: string | null
  leistungsumfang: string
  verguetung_text?: string | null
  regiesatz_netto?: number | null
  einbehalt_prozent: number
  zahlungsziel_tage: number
  aufmass_rhythmus_tage: number
  /** Optional z. B. „Ergänzungsvereinbarung“ statt Standardtitel */
  dokument_titel?: string | null
  /** Anzeige „Vertrag vom …“ statt Vertrags-Nr. */
  vertrag_vom?: string | null
  /** Bezug Ursprungsvertrag „vom …“ (Nachtrag) */
  bezug_vertrag_vom?: string | null
  /** Bezug auf Ursprungsvertrag per Nummer (CRM) — nur wenn kein bezug_vertrag_vom */
  bezug_vertrags_nr?: string | null
  firm: FirmenEinstellungen
  handwerker: VertragHandwerkerSnapshot
}
