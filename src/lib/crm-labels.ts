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

export const LIST = {
  hinzufuegen: 'Hinzufügen',
  hochladen: 'Hochladen',
  export: 'Export',
  loeschen: 'Löschen',
  bearbeiten: 'Bearbeiten',
  oeffnen: 'Öffnen',
  duplizieren: 'Duplizieren',
  speichern: 'Speichern',
  alle: 'Alle',
  keine: 'Keine',
} as const

export const DOC = {
  dokumente: 'Dokumente',
  berichtErstellen: 'Bericht erstellen',
  uploadHint: 'Dateien hier ablegen oder klicken',
  emptyTitle: 'Keine Dokumente',
  emptyHint: 'Dateien über „Hochladen“ oder per Drag & Drop ablegen.',
} as const

export const CHECKLISTE = {
  tab: 'Checkliste',
  laeuft: 'Läuft',
  warteHv: 'Warte auf Hausmeister-Prüfung',
  warteHvHint:
    'Der Hausmeister prüft vor Ort. Ergebnis und dokumentierte Punkte erscheinen hier nach Abschluss.',
  ergebnis: 'Checkliste — Ergebnis',
} as const
