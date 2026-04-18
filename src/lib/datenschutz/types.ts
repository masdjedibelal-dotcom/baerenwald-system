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

export type DatenschutzAnfrageRow = {
  id: string
  typ: string
  name: string
  email: string
  beschreibung: string | null
  status: string
  erledigt_at: string | null
  notizen: string | null
  created_at: string
}

export type DatenschutzFaelligRow = {
  kategorie: string
  referenz_id: string
  titel: string
  basis_datum: string
  monate_faellig: number
  beschreibung: string
}
