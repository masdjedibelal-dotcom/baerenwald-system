/** Typen für Dokument-KI (Angebot/Rechnung) — alles als Positionen inkl. Titel/Beschreibung */

export type AngebotKiScope = 'positionen'

/** Titel & Beschreibung sind virtuelle Positionen, keine separaten Felder. */
export type AngebotKiPositionRolle = 'titel' | 'beschreibung' | 'leistung'

export type AngebotKiMatchKind = 'vorhanden_wizard' | 'preisliste' | 'neu'

export type AngebotKiPositionVorschlag = {
  /** Temporäre ID der Antwort */
  id: string
  rolle: AngebotKiPositionRolle
  leistung: string
  beschreibung: string
  menge: number
  einheit: string
  preis_netto: number
  gewerk_slug?: string | null
  gewerk_name?: string | null
  match: {
    kind: AngebotKiMatchKind
    /** Wizard-Zeilen-ID, Preisliste-ID oder Meta-ID */
    ref_id?: string | null
    label?: string | null
    confidence: number
  }
  /** true = Zeile anlegen/ersetzen; false = überspringen (nur Info) */
  anwenden: boolean
}

export type AngebotKiErgebnis = {
  positionen: AngebotKiPositionVorschlag[]
  hinweis?: string | null
}

export type AngebotKiLernenInput = {
  scope?: AngebotKiScope
  prompt: string
  gewerk_slug?: string | null
  kontext: Record<string, unknown>
  ergebnis: AngebotKiErgebnis
}
