/** Spalten-Mapping: Werte = exakte CSV-Überschriften (erste Zeile) */
export type PreislistenImportMapping = {
  gewerk: string
  kategorie: string
  leistung: string
  einheit: string
  preis_min: string
  preis_max: string
}

export type PreislistenImportFehler = { zeile: number; grund: string }

export type PreislistenImportResponse = {
  importiert: number
  uebersprungen: number
  fehler: PreislistenImportFehler[]
}
