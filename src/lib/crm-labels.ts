/** Zentrale UI-Labels — eine Quelle für Copy-Konsistenz. */

export const ACTIVITY_TAB_LABEL = 'Aktivität'

export const PROJEKT_PHASEN_TAB_LABEL = 'Projektphasen'

export const ACTIVITY_SECTIONS = {
  kommunikation: 'Kommunikation',
  verlauf: ACTIVITY_TAB_LABEL,
  notizen: 'Notizen',
  dokumente: 'Dokumente',
  fotos: 'Fotos',
} as const

export const CTA = {
  angebotErstellen: 'Angebot erstellen',
  angebotAnnehmen: 'Angebot annehmen',
  angeboteOeffnen: 'Angebote',
  finanzenOeffnen: 'Finanzen öffnen',
  zurueckUebersicht: 'Zurück zur Übersicht',
} as const

/** Lead-Status `abgebrochen` → Vertriebs-Sprache. */
export const LEAD_ABGEBROCHEN_LABEL = 'Verloren'
