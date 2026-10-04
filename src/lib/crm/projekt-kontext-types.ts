export type ProjektKetteKind = 'kunde' | 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type ProjektAngebotKurz = {
  id: string
  angebotsnr: string | null
  status: string
  status_einfach: string | null
  gueltig_bis: string | null
  created_at: string
  gesamt_fix: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  /** Für konsolidierte Vorgangs-Akte */
  pdf_url?: string | null
  /** Projekttitel des Angebots */
  leistungsumfang?: string | null
}

export type ProjektRechnungKurz = {
  id: string
  rechnungsnummer: string
  status: string
  brutto: number | null
  rechnungsdatum: string
  auftrag_id: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  beleg_typ?: string | null
  pdf_url?: string | null
  gesendet_at?: string | null
  created_at?: string | null
}

export type ProjektKontext = {
  kunde: { id: string; name: string } | null
  lead: {
    id: string
    label: string
    status: string
    org_freigabe_status?: string | null
    created_at?: string | null
  } | null
  angebote: ProjektAngebotKurz[]
  auftrag: {
    id: string
    titel: string | null
    status: string
    created_at?: string | null
    /** Für Dead-Ref-Erkennung (Angebot gelöscht, FK noch gesetzt) */
    angebot_id?: string | null
    /** Für konsolidierte Akte über alle Phasen */
    abnahme_protokoll_url?: string | null
    abschlussdokumentation_url?: string | null
    abschlussdokumentation_gesendet_at?: string | null
  } | null
  rechnungen: ProjektRechnungKurz[]
  /** Vor-Ort-Adresse (Anfrage, sonst Kunde) — im Detailkopf mit Karten-Link. */
  ort?: string | null
  /** Zugewiesene Partner (Einsätze am Auftrag). */
  partner?: string[]
  activeKind: ProjektKetteKind
  activeId: string
}
