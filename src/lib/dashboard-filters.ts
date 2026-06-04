/** Vordefinierte Links vom Dashboard (Stat-Cards) mit Query-Parametern für Listen-Seiten. */
export const DASHBOARD_FILTER_LINKS = {
  neueAnfragen: '/anfragen?zeitraum=diese_woche',
  offeneAngebote:
    '/angebote?status=gesendet_kunde,gesendet_handwerker,handwerker_akzeptiert',
  aktiveAuftraege: '/auftraege?status=offen,in_arbeit,abnahme',
  abgeschlosseneAuftraege: '/auftraege?status=abgeschlossen',
} as const
