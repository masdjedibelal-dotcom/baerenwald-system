/**
 * Kanonische Create-Entry-Pfade fürs CRM.
 * FAB + TopBar-CTAs + Deep-Links sollen hierher zeigen — keine Parallel-Legacy-Forms.
 *
 * Naming:
 * - Partner (Create) = Handwerker-Entity → `/neu?art=handwerker` → Liste `/handwerker`
 * - Netzwerk (Tabelle `partner`) hat eigenen Create-Flow unter `/partner` (nicht FAB)
 *
 * Surface-Regel (UX2-3):
 * - Multi-Step / Dokument-Flow = Fullscreen-Wizard (Anfrage, Angebot, Rechnung-Wizard)
 * - Stammdaten = Modal/Sheet über der Liste (Kunde, Partner/Handwerker)
 * Gleiche Primitives (MockModal, MockField, Buttons) — nicht zwingend gleiche Route-Art.
 * Angebot: Kunde-Gate darf listenähnlich bleiben, danach immer Wizard.
 * Rechnung: Kunde (+ optional Vorgang) im FAB-Modal, danach Wizard.
 */

export type CrmCreateArt =
  | 'anfrage'
  | 'angebot'
  | 'rechnung'
  | 'kunde'
  | 'handwerker'
  | 'partner'

/** Anfrage = Staff-Funnel (wie Website). */
export function createAnfrageHref(kundeId?: string | null): string {
  const kid = kundeId?.trim()
  return kid ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}` : '/anfragen/neu'
}

/**
 * Angebot: direkt `/angebote/neu` — Kundenschritt im Gate (wie Anfrage-Funnel).
 * Rechnung: Kundenschritt über FAB-Modal-Host `/neu?art=rechnung`.
 */
export function createAngebotHref(kundeId?: string | null): string {
  const kid = kundeId?.trim()
  return kid
    ? `/angebote/neu?kunde_id=${encodeURIComponent(kid)}`
    : '/angebote/neu'
}

export function createRechnungHref(kundeId?: string | null): string {
  const kid = kundeId?.trim()
  return kid
    ? `/neu?art=rechnung&kunde_id=${encodeURIComponent(kid)}`
    : '/neu?art=rechnung'
}

export function createKundeHref(): string {
  return '/neu?art=kunde'
}

/** Partnerbetrieb = Tabelle `handwerker` (eine Create-Route). */
export function createPartnerHref(): string {
  return '/neu?art=handwerker'
}

/** Alias — gleiche Zielseite wie createPartnerHref. */
export function createHandwerkerHref(): string {
  return createPartnerHref()
}

/**
 * Deep-Link `/neu?art=` → kanonische Ziel-URL wenn möglich.
 * `null` = auf `/neu` belassen (Stammdaten-Form / Modal-Host).
 */
export function resolveNeuArtHref(
  art: string | null | undefined,
  kundeId?: string | null
): string | null {
  const a = (art ?? '').trim().toLowerCase()
  if (a === 'anfrage') return createAnfrageHref(kundeId)
  if (a === 'angebot') return createAngebotHref(kundeId)
  if (a === 'rechnung') return null
  if (a === 'kunde') return null
  if (a === 'handwerker' || a === 'partner') return null
  if (a === 'auftrag') return createAnfrageHref(kundeId) // kein Direkt-Auftrag
  return null
}

export const CREATE_ENTRY_LABELS = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  rechnung: 'Neue Rechnung',
  kunde: 'Neuer Kunde',
  partner: 'Neuer Partner',
} as const
