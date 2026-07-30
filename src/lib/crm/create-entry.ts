/**
 * Kanonische Create-Entry-Pfade fürs CRM.
 * FAB öffnet Anfrage/Kunde/Handwerker/Angebot/Rechnung als Overlay auf der aktuellen Seite
 * (`openFabCreate` / `FabCreateHost`) — ohne weiße `/neu`- bzw. `/anfragen/neu`-Zwischenseite.
 * Deep-Links `/neu?art=` bleiben für Copilot/Bookmarks.
 *
 * Naming:
 * - Handwerker (Create) = Tabelle `handwerker` → Overlay oder `/neu?art=handwerker` → Liste `/handwerker`
 * - Tabelle `partner` bleibt datenmäßig; kein Nav-/Create-Einstieg mehr (Phase 3)
 *
 * Surface-Regel (Spec §6 / Phase 2):
 * - A DocumentCanvas — Dokument-Flows (Angebot, Rechnung, Abnahme, Abschlussbericht)
 * - B EditorSheet — Entity create/edit (Desktop Slide-over, Mobil Bottom Sheet; nie Center)
 * - C ActionSheet — nur Aktion wählen
 * - D Inline — leichte Detail-Felder
 * - Kunde/Handwerker Create = EditorSheet Overlay (FAB) bzw. Deep-Link Host `/neu?art=`
 * - PickerSheet = Kunde/Katalog/Vorgang wählen (+ Header-Neu)
 * - Overlay: kein Modal-in-Modal
 * Angebot: Kunde-Gate = PickerSheet, danach DocumentCanvas.
 * Rechnung: Kundenschritt im FAB-Overlay als PickerSheet, danach DocumentCanvas.
 */

export type CrmCreateArt =
  | 'anfrage'
  | 'angebot'
  | 'rechnung'
  | 'kunde'
  | 'handwerker'
  | 'partner'

/** Deep-Link / Bookmark. FAB öffnet Anfrage als Overlay (`openFabCreate('anfrage')`). */
export function createAnfrageHref(kundeId?: string | null): string {
  const kid = kundeId?.trim()
  return kid ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}` : '/anfragen/neu'
}

/**
 * Angebot: direkt `/angebote/neu` — Kundenschritt im Gate (wie Anfrage-Funnel).
 * Rechnung: Kundenschritt über FAB-Overlay (`openFabCreate('rechnung')`);
 * Deep-Link bleibt `/neu?art=rechnung`.
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

/** Handwerker = Tabelle `handwerker` (eine Create-Route). */
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
  partner: 'Neuer Handwerker',
  handwerker: 'Neuer Handwerker',
} as const
