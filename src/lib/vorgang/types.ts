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
}

export type VorgangAuftragInput = {
  id: string
  status: string
  titel?: string | null
  created_at: string
  updated_at?: string | null
  handwerkerAktionOffen?: boolean
}

export type VorgangRechnungInput = {
  id: string
  status: string
  faellig?: string | null
  created_at: string
  updated_at?: string | null
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
  kundeName: string | null
  wertLabel: string | null
  detailHref: string
}

export type PortalRole = 'crm' | 'kunde' | 'hv' | 'handwerker' | 'mieter'
