import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragPosition, Handwerker } from '@/lib/types'

export type HandwerkerVertragTyp = 'projekt' | 'rahmen'

export type HandwerkerVertragStatus = 'entwurf' | 'pdf_erzeugt' | 'unterschrieben'

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
  notizen: string | null
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
  firm: FirmenEinstellungen
  handwerker: VertragHandwerkerSnapshot
}
