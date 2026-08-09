export type VorgangPhase = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type VorgangActor = 'freigabe' | 'handwerker' | 'kunde' | 'bw'

export type VorgangAngebotInput = {
  id: string
  status?: string | null
  status_einfach?: string | null
  created_at: string
  updated_at?: string | null
  gesendet_am?: string | null
  gesendet_kunde_at?: string | null
  /** Projekt-/Leistungstitel (Spalte oder Wizard) */
  leistungsumfang?: string | null
  notizen?: string | null
  titel?: string | null
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}

export type VorgangAuftragInput = {
  id: string
  status: string
  titel?: string | null
  created_at: string
  updated_at?: string | null
  handwerkerAktionOffen?: boolean
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}

export type VorgangRechnungInput = {
  id: string
  status: string
  faellig?: string | null
  created_at: string
  updated_at?: string | null
  /**
   * `abschlag` / `schluss` = eigene Listen-Zeile (Titel), Phase gewinnt trotzdem
   * sobald Status ≠ Entwurf/Storno — Stamm wandert in Rechnungsphase.
   * `voll` / fehlend = gleiche Phasen-Regel.
   */
  rechnung_art?: string | null
  abschlag_index?: number | null
  rechnungsnummer?: string | null
  brutto?: number | null
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}

export type VorgangLeadInput = {
  id: string
  status: string
  situation?: string | null
  funnel_daten?: unknown
  kanal?: string | null
  org_freigabe_status?: string | null
  hv_meldung_status?: string | null
  kontakt_name?: string | null
  plz?: string | null
  bereiche?: string[] | null
  created_at: string
  updated_at?: string | null
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}

export type ResolveVorgangInput = {
  lead: VorgangLeadInput
  angebote?: VorgangAngebotInput[]
  auftraege?: VorgangAuftragInput[]
  rechnungen?: VorgangRechnungInput[]
  titel?: string | null
}

export type ResolvedVorgangBadges = {
  notfall?: boolean
  wartet_freigabe?: boolean
}

/** Kanonischer Output von `resolveVorgang()` — einzige Resolver-Output-Shape. */
export type ResolvedVorgang = {
  phase: VorgangPhase
  unterstatus: string
  unterstatusLabel: string
  needsAction: boolean
  actor: VorgangActor | null
  badges: ResolvedVorgangBadges
  ueberfaellig: boolean
  kanalMeta: string | null
  titel: string
  entityId: string
  entityType: VorgangPhase
  updatedAt: string
}

/** Zeile in `/vorgaenge` (Resolver + Listen-Metadaten). */
export type VorgangListeRow = ResolvedVorgang & {
  leadId: string
  kundeId?: string | null
  kundeName: string | null
  wertLabel: string | null
  detailHref: string
  /** Handwerker an Auftragspositionen dieses Vorgangs (für Detail-`restrictHandwerker`). */
  handwerkerIds?: string[]
  /** Bestand: wiederkehrende Leistung (Phase-Entity oder Lead). */
  ist_wiederkehrend?: boolean
  wiederkehr_turnus?: string | null
  /** FAB-/Direktrechnung ohne Anfrage-/Auftrags-Verknüpfung. */
  standalone?: boolean
  kontaktTelefon?: string | null
  kontaktEmail?: string | null
  /** Ersetzt-Kette (Angebot/Rechnung). */
  ersetzt_durch?: string | null
}

export type PortalRole = 'crm' | 'kunde' | 'hv' | 'handwerker' | 'mieter'
