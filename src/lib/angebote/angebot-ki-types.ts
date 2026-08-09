/** Typen für Dokument-KI (Angebot/Rechnung) — alles als Positionen inkl. Titel/Beschreibung */

export type AngebotKiScope = 'positionen'

/** Titel & Beschreibung sind virtuelle Positionen, keine separaten Felder. */
export type AngebotKiPositionRolle = 'titel' | 'beschreibung' | 'leistung'

export type AngebotKiMatchKind = 'vorhanden_wizard' | 'preisliste' | 'neu'

export const KI_META_TITEL_ID = '__ki_meta_titel__'
export const KI_META_BESCHREIBUNG_ID = '__ki_meta_beschreibung__'

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

export type AngebotKiKontextPosition = {
  id: string
  rolle?: AngebotKiPositionRolle
  leistung: string
  beschreibung: string
  menge: number
  einheit: string
  preis_netto: number
  gewerk_slug?: string | null
  gewerk_name?: string | null
  preisliste_id?: string | null
}

export type AngebotKiKontextPreisliste = {
  id: string
  leistung: string
  einheit: string
  preis_min: number
  gewerk_slug?: string | null
  gewerk_name?: string | null
  kategorie?: string | null
}

export type AngebotKiGenerateInput = {
  prompt: string
  /** Immer Positionen (Titel/Beschreibung sind darin enthalten). */
  scope?: AngebotKiScope
  leadKurz?: string | null
  titel?: string | null
  beschreibung?: string | null
  positionen: AngebotKiKontextPosition[]
  preislisten: AngebotKiKontextPreisliste[]
  gewerke: Array<{ slug: string; name: string }>
}

export type AngebotKiLernenInput = {
  scope?: AngebotKiScope
  prompt: string
  gewerk_slug?: string | null
  kontext: Record<string, unknown>
  ergebnis: AngebotKiErgebnis
}

/** Virtuelle Meta-Positionen für Titel/Beschreibung + echte Leistungszeilen. */
export function buildKiKontextMitMeta(input: {
  titel?: string | null
  beschreibung?: string | null
  positionen: AngebotKiKontextPosition[]
}): AngebotKiKontextPosition[] {
  const meta: AngebotKiKontextPosition[] = [
    {
      id: KI_META_TITEL_ID,
      rolle: 'titel',
      leistung: 'Titel',
      beschreibung: (input.titel ?? '').trim(),
      menge: 1,
      einheit: '—',
      preis_netto: 0,
    },
    {
      id: KI_META_BESCHREIBUNG_ID,
      rolle: 'beschreibung',
      leistung: 'Beschreibung',
      beschreibung: (input.beschreibung ?? '').trim(),
      menge: 1,
      einheit: '—',
      preis_netto: 0,
    },
  ]
  const leistungen = input.positionen
    .filter((p) => p.rolle !== 'titel' && p.rolle !== 'beschreibung')
    .map((p) => ({ ...p, rolle: (p.rolle ?? 'leistung') as AngebotKiPositionRolle }))
  return [...meta, ...leistungen]
}
