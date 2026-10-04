

/** Deep-Link / Bookmark. FAB öffnet Anfrage als Overlay (`openFabCreate('anfrage')`). */
export function createAnfrageHref(kundeId?: string | null): string {
  const kid = kundeId?.trim()
  return kid ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}` : '/anfragen/neu'
}

/**
 * Angebot: mit kunde_id → Wizard direkt; ohne → Gate auf `/angebote/neu`.
 * Rechnung: mit kunde_id → Wizard direkt; ohne → FAB-Overlay `/neu?art=rechnung`.
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
    ? `/rechnungen/neu?kunde_id=${encodeURIComponent(kid)}`
    : '/neu?art=rechnung'
}

export function createKundeHref(): string {
  return '/neu?art=kunde'
}

/** Partner = Tabelle `handwerker` (eine Create-Route). */
export function createPartnerHref(): string {
  return '/neu?art=handwerker'
}

export const CREATE_ENTRY_LABELS = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  rechnung: 'Neue Rechnung',
  kunde: 'Neuer Kunde',
  partner: 'Neuer Partner',
  handwerker: 'Neuer Partner',
} as const
