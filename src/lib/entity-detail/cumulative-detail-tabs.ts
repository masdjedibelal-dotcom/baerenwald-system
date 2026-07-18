/** Kumulative Phasen-Details: frühere Infos bleiben als eigene Menüpunkte erhalten. */

export const CUMULATIVE_DETAIL_TAB = {
  anfrage: 'anfrage-details',
  angebot: 'angebot-details',
  auftrag: 'auftrag-details',
  rechnung: 'rechnung-details',
} as const

export const CUMULATIVE_DETAIL_LABEL = {
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
} as const

export type CumulativeDetailPhase = keyof typeof CUMULATIVE_DETAIL_TAB

/** Query-Aliase → stabile Tab-ID für frühere Phasen. */
export function resolveCumulativeDetailTabAlias(raw: string): string | null {
  const tab = raw.trim().toLowerCase().replace(/^#/, '')
  if (!tab) return null
  if (
    tab === 'anfrage' ||
    tab === 'anfrage-details' ||
    tab === 'anfragedetails' ||
    tab === 'anfrage_details'
  ) {
    return CUMULATIVE_DETAIL_TAB.anfrage
  }
  if (
    tab === 'angebot' ||
    tab === 'angebot-details' ||
    tab === 'angebotdetails' ||
    tab === 'angebot_details'
  ) {
    return CUMULATIVE_DETAIL_TAB.angebot
  }
  if (
    tab === 'auftrag' ||
    tab === 'auftrag-details' ||
    tab === 'auftragsdetails' ||
    tab === 'auftrag_details'
  ) {
    return CUMULATIVE_DETAIL_TAB.auftrag
  }
  if (
    tab === 'rechnung' ||
    tab === 'rechnung-details' ||
    tab === 'rechnungsdetails' ||
    tab === 'rechnung_details'
  ) {
    return CUMULATIVE_DETAIL_TAB.rechnung
  }
  return null
}
