/**
 * E6 — Status-Anzeige „Angenommen“ (nicht „akzeptiert“ / „Akzeptiert“).
 * DB-Werte (akzeptiert, handwerker_akzeptiert, …) bleiben unverändert.
 */
export const COPY_STATUS = {
  /** Partner-/Angebots-Annahme in der UI */
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  angefragt: 'Angefragt',
  zugewiesen: 'Zugewiesen',
  ausstehend: 'Ausstehend',
  anPartnerGesendet: 'An Partner gesendet',
} as const

export type CopyStatusKey = keyof typeof COPY_STATUS
