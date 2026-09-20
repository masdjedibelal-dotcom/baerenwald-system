/**
 * Kanonische Button-Verben (SURFACE-NUTZER-COPY).
 * Keine freien Varianten in der UI — hier erweitern.
 */
export const COPY_BUTTON = {
  speichern: 'Speichern',
  entwurfSpeichern: 'Entwurf speichern',
  abbrechen: 'Abbrechen',
  loeschen: 'Löschen',
  senden: 'Senden',
  angebotSenden: 'Angebot senden',
  rechnungErstellen: 'Rechnung erstellen',
  verwerfen: 'Verwerfen',
  bearbeiten: 'Bearbeiten',
  hinzufuegen: 'Hinzufügen',
  uebernehmen: 'Übernehmen',
  schliessen: 'Schließen',
  weiter: 'Weiter',
  zurueck: 'Zurück',
  bestaetigen: 'Bestätigen',
  ablehnen: 'Ablehnen',
  annehmen: 'Annehmen',
  duplizieren: 'Duplizieren',
  vorschau: 'Vorschau',
  ohneVersand: 'Ohne Versand',
  weiterBearbeiten: 'Weiter bearbeiten',
  aenderungenVerwerfenFrage: 'Änderungen verwerfen?',
} as const

export type CopyButtonKey = keyof typeof COPY_BUTTON
