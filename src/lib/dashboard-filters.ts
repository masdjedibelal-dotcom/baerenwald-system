/** Vordefinierte Links vom Dashboard (Stat-Cards) mit Query-Parametern für Listen-Seiten. */
export const DASHBOARD_FILTER_LINKS = {
  neueAnfragen: '/anfragen?status=neu&zeitraum=heute',
  offeneAngebote:
    '/angebote?status=gesendet_kunde,gesendet_handwerker,handwerker_akzeptiert',
  aktiveAuftraege: '/auftraege?status=offen,in_arbeit,abnahme',
  hwImEinsatz: '/handwerker?filter=einsatz',
  ueberfaellig: '/rechnungen?filter=ueberfaellig',
} as const
