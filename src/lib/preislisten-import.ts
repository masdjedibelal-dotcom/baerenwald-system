/** Spalten-Mapping: Werte = exakte CSV-Überschriften (erste Zeile) */
export type PreislistenImportMapping = {
  gewerk: string
  kategorie: string
  leistung: string
  einheit: string
  /** Netto-Einzelpreis */
  preis: string
  /** Legacy-CSV */
  preis_min?: string
}

export type PreislistenImportFehler = { zeile: number; grund: string }

export type PreislistenImportResponse = {
  importiert: number
  uebersprungen: number
  fehler: PreislistenImportFehler[]
}
