/**
 * Kanonische Empty-State-Titel (MockEmpty).
 * Titel ≤ 4 Wörter wo möglich; Erweiterung nur hier.
 */
export const EMPTY = {
  partnerZugewiesen: 'Keine Partner zugewiesen.',
  partnerAktiv: 'Keine aktiven Partner gefunden.',
  partnerWeitere: 'Keine weiteren Partner.',
  partnerGewerk: 'Keine Partner mit diesem Gewerk in den Stammdaten.',
  treffer: 'Keine Treffer.',
  trefferKurz: 'Keine Treffer',
  leistungen: 'Keine Leistungen vorhanden.',
  leistungenErfasst: 'Keine Leistungen erfasst',
  leistungenZugewiesen: 'Keine einzelnen Leistungen zugewiesen.',
  maengelProtokoll: 'Keine Mängel im Protokoll — alles abgenommen.',
  maengelOptional: 'Keine Mängel — optional Punkte hinzufügen.',
  nachtraege: 'Keine Nachträge.',
  termineHeute: 'Keine Termine für heute.',
  teamdaten: 'Keine Teamdaten verfügbar.',
  ausfuehrung: 'Keine Ausführungsdaten',
  preise: 'Keine Preisdaten',
  pakete: 'Keine Pakete',
  eintraegeKategorie: 'Keine Einträge in dieser Kategorie',
  datenBereich: 'Keine Daten für diesen Bereich',
  datenZeitraum: 'Keine Daten im Zeitraum.',
  emailsFilter: 'Keine E-Mails für diesen Filter.',
  kunden: 'Keine Kunden gefunden',
  leistungAuswahl: 'Keine Leistung ausgewählt.',
  eintraege: 'Keine Einträge.',
  melderAnfragen: 'Keine Melder-Anfragen gefunden.',
  /** @deprecated Nutze melderAnfragen — kein „Lead“ in Kunden-UI */
  melderLeads: 'Keine Melder-Anfragen gefunden.',
  positionenGewerk: 'Keine Positionen für dieses Gewerk.',
  positionen: 'Keine Positionen',
  verlaufFilter: 'Keine Einträge in diesem Filter.',
  verlaufDetails: 'Keine weiteren Details hinterlegt.',
  rate: 'Keine Rate ausgewählt.',
  vorschau: 'Keine Vorschau',
  vorschauVerfuegbar: 'Keine Vorschau verfügbar.',
  anlageGewaehlt: 'Keine Anlage gewählt',
  rechnungenFilter: 'Keine Rechnungen in diesem Filter.',
  rechnungenOffen:
    'Keine offenen Rechnungen — abgeschlossene Aufträge ohne Rechnung erscheinen hier automatisch.',
  gewerkeStammdaten: 'Keine Gewerke in den Stammdaten — bitte freie Bezeichnung nutzen.',
  aktionen: 'Keine Aktionen',
} as const

export type EmptyKey = keyof typeof EMPTY
