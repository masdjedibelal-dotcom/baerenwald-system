export type ObjektKontaktRolle = 'hausmeister' | 'beirat' | 'dienstleister' | 'notfall' | 'sonstiges'

export type ObjektKontakt = {
  id: string
  kunde_id: string
  kunde_objekt_id: string
  rolle: ObjektKontaktRolle
  name: string
  telefon: string | null
  email: string | null
  notiz: string | null
  sort_order: number
  aktiv: boolean
  created_at: string
  updated_at: string
}

export type ObjektEinheit = {
  id: string
  kunde_objekt_id: string
  bezeichnung: string
  wohnflaeche_m2?: number | null
  sort_order: number
  aktiv: boolean
  created_at: string
  updated_at: string
}

export type EinheitBewohner = {
  id: string
  kunde_id: string
  objekt_einheit_id: string
  name: string
  telefon: string | null
  email: string | null
  aktiv: boolean
  anonymisiert_am: string | null
  created_at: string
  updated_at: string
  objekt_einheiten?: { bezeichnung: string } | null
}

export type AktenNotiz = {
  id: string
  kunde_id: string
  bezug_typ: 'objekt' | 'vorgang'
  kunde_objekt_id: string | null
  lead_id: string | null
  text: string
  wiedervorlage_am: string | null
  erledigt_am: string | null
  created_at: string
}

export type ObjektDokument = {
  id: string
  kunde_id: string
  kunde_objekt_id: string
  kategorie: string
  titel: string
  storage_url: string | null
  ablauf_datum: string | null
  status: string
  created_at: string
}

export type FremdVorgang = {
  id: string
  kunde_id: string
  kunde_objekt_id: string
  titel: string
  datum: string
  kategorie: string
  betrag: number | null
  dokument_url: string | null
  notiz: string | null
  quelle: string
  created_at: string
}

export type ObjektAkteReadOnlyPayload = {
  notizen: AktenNotiz[]
  dokumente: ObjektDokument[]
  fremdVorgaenge: FremdVorgang[]
}

export type ObjektAkteDetailPayload = ObjektAkteReadOnlyPayload & {
  kontakte: ObjektKontakt[]
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
}

export type ObjektKontaktInput = {
  rolle: ObjektKontaktRolle
  name: string
  telefon?: string | null
  email?: string | null
  notiz?: string | null
}

export type EinheitBewohnerInput = {
  objekt_einheit_id: string
  name: string
  telefon?: string | null
  email?: string | null
}
