export type DatenschutzFristRow = {
  id: string
  kategorie: string
  bezeichnung: string
  frist_monate: number
  beschreibung: string | null
  gesetzliche_grundlage: string | null
  aktiv: boolean
}

export type DatenschutzLoeschlogRow = {
  id: string
  typ: string
  referenz_id: string | null
  referenz_typ: string | null
  grund: string
  geloescht_von: string | null
  created_at: string
}

export type DatenschutzAnfrageKontext = 'mieter_meldung' | 'privatkunde' | 'partner' | 'sonstiges'

export type DatenschutzAnfrageRow = {
  id: string
  typ: string
  name: string
  email: string
  beschreibung: string | null
  kontext: string | null
  status: string
  erledigt_at: string | null
  notizen: string | null
  created_at: string
}

export type DatenschutzVvtRow = {
  id: string
  titel: string
  zweck: string
  rechtsgrundlage: string | null
  betroffene_kategorien: string | null
  datenarten: string | null
  empfaenger: string | null
  drittland: string | null
  loeschfrist_hinweis: string | null
  toms: string | null
  aktiv: boolean
  sort_order: number
}

export type MelderLeadKurz = {
  id: string
  melder_name: string | null
  melder_email: string | null
  melder_einheit: string | null
  kanal: string
  status: string
  created_at: string
  auftraggeber_kunde_id: string | null
}

export type DatenschutzFaelligRow = {
  kategorie: string
  referenz_id: string
  titel: string
  basis_datum: string
  monate_faellig: number
  beschreibung: string
}
