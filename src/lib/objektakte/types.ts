import type { HausmeisterAmObjekt, OrgHausmeister } from '@/lib/org/org-hausmeister-types'

export type ObjektKontaktRolle = 'hausmeister' | 'beirat' | 'dienstleister' | 'notfall' | 'sonstiges'

export type EinheitBewohnerRolle = 'mieter' | 'eigentuemer'

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
  etage?: string | null
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
  rolle?: EinheitBewohnerRolle | null
  sondereigentum_verwaltung?: boolean | null
  miete_hinweis?: string | null
  /** Verknüpfter Privatkunde (CRM-Stamm / Portal-Login). */
  portal_kunde_id?: string | null
  aktiv: boolean
  anonymisiert_am: string | null
  created_at: string
  updated_at: string
  objekt_einheiten?: { bezeichnung: string; etage?: string | null } | null
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

import type { ObjektAnlageWartungsintervall } from '@/lib/objektakte/labels'

export type ObjektAnlageStatus = 'aktiv' | 'ausgetauscht' | 'stillgelegt'

export type ObjektAnlage = {
  id: string
  kunde_id: string
  kunde_objekt_id: string
  bezeichnung: string
  gewerk_id: string
  standort: string | null
  objekt_einheit_id: string | null
  einbau_datum: string | null
  foto_url: string | null
  notiz: string | null
  hersteller: string | null
  modell: string | null
  seriennummer: string | null
  anschaffungswert_eur: number | null
  garantie_bis: string | null
  gewaehrleistung_bis: string | null
  wartungsintervall: ObjektAnlageWartungsintervall | null
  letzte_wartung_am: string | null
  dokument_urls: string[]
  status: ObjektAnlageStatus
  sort_order: number
  created_at: string
  updated_at: string
  gewerke?: { id: string; name: string; slug: string } | null
  objekt_einheiten?: { bezeichnung: string; etage?: string | null } | null
  /** Anzahl verknüpfter Vorgänge (Loader-Aggregat). */
  vorgang_count?: number
}

export type ObjektAnlageInput = {
  bezeichnung: string
  gewerk_id: string
  standort?: string | null
  objekt_einheit_id?: string | null
  einbau_datum?: string | null
  foto_url?: string | null
  notiz?: string | null
  status?: ObjektAnlageStatus
  hersteller?: string | null
  modell?: string | null
  seriennummer?: string | null
  anschaffungswert_eur?: number | null
  garantie_bis?: string | null
  gewaehrleistung_bis?: string | null
  wartungsintervall?: ObjektAnlageWartungsintervall | null
  letzte_wartung_am?: string | null
  dokument_urls?: string[] | null
}

/** Alle Felder aus bestehender Anlage — z. B. für Status-Update ohne Datenverlust. */
export function anlageToInput(a: ObjektAnlage): ObjektAnlageInput {
  return {
    bezeichnung: a.bezeichnung,
    gewerk_id: a.gewerk_id,
    standort: a.standort,
    objekt_einheit_id: a.objekt_einheit_id,
    einbau_datum: a.einbau_datum,
    foto_url: a.foto_url,
    notiz: a.notiz,
    status: a.status,
    hersteller: a.hersteller,
    modell: a.modell,
    seriennummer: a.seriennummer,
    anschaffungswert_eur: a.anschaffungswert_eur,
    garantie_bis: a.garantie_bis,
    gewaehrleistung_bis: a.gewaehrleistung_bis,
    wartungsintervall: a.wartungsintervall,
    letzte_wartung_am: a.letzte_wartung_am,
    dokument_urls: a.dokument_urls ?? [],
  }
}

export type ObjektAnlageVorgangRow = {
  id: string
  titel: string
  created_at: string
  status: string | null
  phase: string | null
  kosten_label: string
}

import type { VorgangPhase } from '@/lib/vorgang/types'

/** Chronologie-Zeile für Objekt-Historie-Tab / Bericht. */
export type ObjektHistorieRow = {
  leadId: string
  datum: string
  titel: string
  einheitLabel: string | null
  anlageLabel: string | null
  anlageId: string | null
  gewerkLabel: string | null
  phase: VorgangPhase | 'bestand'
  unterstatus: string
  unterstatusLabel: string
  kostenLabel: string
  kostenEuro: number | null
  detailHref: string
  ist_wiederkehrend?: boolean
}

export type ObjektHistoriePayload = {
  rows: ObjektHistorieRow[]
  leadIds: string[]
}

export type ObjektAkteDetailPayload = ObjektAkteReadOnlyPayload & {
  kontakte: ObjektKontakt[]
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  anlagen: ObjektAnlage[]
  orgHausmeisterListe: OrgHausmeister[]
  hausmeisterAmObjekt: HausmeisterAmObjekt | null
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
  rolle?: EinheitBewohnerRolle
  sondereigentum_verwaltung?: boolean
  miete_hinweis?: string | null
}

/** Einheit anlegen (Portal: Bezeichnung + optional Etage/m²). */
export type ObjektEinheitInput = {
  bezeichnung: string
  etage?: string | null
  wohnflaeche_m2?: number | null
}

/**
 * Legacy: Mieter + Einheit gemeinsam (HV-Anfrage).
 * Objekt-UI: createObjektEinheit + createEinheitBewohner mit fester einheitId.
 */
export type ObjektMieterInput = {
  name: string
  /** Wohnungs-/Einheiten-Bezeichnung, Default „Allgemein“ */
  wohnung?: string | null
  etage?: string | null
  telefon?: string | null
  email?: string | null
  wohnflaeche_m2?: number | null
  rolle?: EinheitBewohnerRolle
  sondereigentum_verwaltung?: boolean
  miete_hinweis?: string | null
}
