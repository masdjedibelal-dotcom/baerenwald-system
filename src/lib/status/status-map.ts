/**
 * Kanonische Status-Map (eine Quelle für Labels).
 * Leitfaden §3 / PATTERN-LEITFADEN: Label + optional Kurzlabel.
 *
 * Aktionsmodell 30.09.2026 (Belal): je Sache 3–4 sichtbare Wörter, mehrere DB-Werte
 * teilen sich ein Wort. Neue Stellen nutzen statusLabel/…StatusDisplay — keine eigenen Maps.
 *
 * ── CRM → Mieter-Timeline (Melde-Status) ──────────────────────────────
 * Mieter-Stufen bleiben eigene Sprache; sie reagieren auf CRM-Wechsel:
 *
 * | CRM-Signal                                              | Mieter-Stufe        |
 * |---------------------------------------------------------|---------------------|
 * | Lead neu / Meldung ohne Bearbeitung                     | Eingegangen         |
 * | Lead kontaktiert \| termin; Freigabe; HV prüft          | In Bearbeitung      |
 * | Auftrag erstellt; HW/Partner gesendet/angefragt         | Beauftragt          |
 * | HW bestätigt; Bautagebuch; mieter_vor_ort_at; in_arbeit | Handwerker vor Ort  |
 * | Abnahme ohne offene Mängel; Positionen erledigt         | Erledigt            |
 * | Offene Mängel (Abnahme)                                 | NICHT Erledigt      |
 *
 * Implementierung: baerenwald `resolveMieterStatusStufe` + Glossar.
 */

export type StatusMapEntry = {
  /** Vollständiges UI-Label */
  label: string
  /** Optional kürzeres Label (Dashboard o. ä.) — immer aus derselben Quelle */
  shortLabel?: string
}

export type VorgangPhaseKey = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

/** Anfrage / Lead */
export const ANFRAGE_STATUS_MAP = {
  // Aktionsmodell 30.09.2026: Neu · In Arbeit · Abgesagt (+ Erledigt, wenn beauftragt)
  neu: { label: 'Neu' },
  kontaktiert: { label: 'In Arbeit' },
  termin: { label: 'In Arbeit' },
  in_bearbeitung: { label: 'In Arbeit' },
  angebot: { label: 'In Arbeit' },
  auftrag: { label: 'Beauftragt' },
  abgeschlossen: { label: 'Beauftragt' },
  hm_erledigt: { label: 'Vom Hausmeister erledigt' },
  abgebrochen: { label: 'Abgesagt' },
  storniert: { label: 'Abgesagt' },
} as const satisfies Record<string, StatusMapEntry>

/** Angebot — Fein- + Einfach-Status */
export const ANGEBOT_STATUS_MAP = {
  // Aktionsmodell: Entwurf · Beim Kunden · Angenommen · Abgelehnt (+ Abgelaufen, Ersetzt)
  entwurf: { label: 'Entwurf' },
  gesendet_handwerker: { label: 'Entwurf' },
  handwerker_akzeptiert: { label: 'Entwurf' },
  gesendet_kunde: { label: 'Beim Kunden' },
  gesendet: { label: 'Beim Kunden' },
  versendet: { label: 'Beim Kunden' },
  angenommen: { label: 'Angenommen' },
  kunde_akzeptiert: { label: 'Angenommen' },
  abgelehnt: { label: 'Abgelehnt' },
  abgelaufen: { label: 'Abgelaufen' },
  ersetzt: { label: 'Ersetzt' },
  storniert: { label: 'Abgelehnt' },
} as const satisfies Record<string, StatusMapEntry>

/** Auftrag */
export const AUFTRAG_STATUS_MAP = {
  // Aktionsmodell: Läuft · Fertig · Storniert (Abnahme ist ein Schritt, kein Status)
  offen: { label: 'Läuft' },
  in_arbeit: { label: 'Läuft' },
  wartend: { label: 'Läuft' },
  abnahme: { label: 'Läuft' },
  abgeschlossen: { label: 'Fertig' },
  storniert: { label: 'Storniert' },
} as const satisfies Record<string, StatusMapEntry>

/** Rechnung */
export const RECHNUNG_STATUS_MAP = {
  // Aktionsmodell: Entwurf · Offen · Bezahlt · Storniert (Überfällig = rot markiertes Offen)
  ausstehend: { label: 'Rechnung fehlt' },
  entwurf: { label: 'Entwurf' },
  gesendet: { label: 'Offen' },
  teilbezahlt: { label: 'Offen' },
  bezahlt: { label: 'Bezahlt' },
  storniert: { label: 'Storniert' },
  korrektur_entwurf: { label: 'Entwurf' },
  korrektur_gespeichert: { label: 'Entwurf' },
  korrektur_versendet: { label: 'Offen' },
  ueberfaellig: { label: 'Überfällig' },
  ueberwiesen: { label: 'Bezahlt' },
} as const satisfies Record<string, StatusMapEntry>

const PHASE_MAPS: Record<VorgangPhaseKey, Record<string, StatusMapEntry>> = {
  anfrage: ANFRAGE_STATUS_MAP,
  angebot: ANGEBOT_STATUS_MAP,
  auftrag: AUFTRAG_STATUS_MAP,
  rechnung: RECHNUNG_STATUS_MAP,
}

/**
 * LEGACY-/Alt-Status außerhalb der kanonischen Map (Teil D / R3-ALTDATEN).
 * Rohwert anzeigen; leerer String → „Unbekannt“. Nie leer, nie crashen.
 */
export function unknownStatusEntry(
  unterstatus: string | null | undefined
): StatusMapEntry {
  const raw = String(unterstatus ?? '').trim().replace(/_/g, ' ')
  // Rohwert nie kleingeschrieben anzeigen („wartend“ → „Wartend“)
  return { label: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Unbekannt' }
}

export function statusMapEntry(
  phase: VorgangPhaseKey,
  unterstatus: string
): StatusMapEntry | null {
  const key = unterstatus.trim().toLowerCase()
  if (!key) return null
  return PHASE_MAPS[phase][key] ?? null
}

/** Kanonischer Eintrag oder Unknown-Fallback (Rohwert / „Unbekannt“). */
export function statusMapEntryOrUnknown(
  phase: VorgangPhaseKey,
  unterstatus: string
): StatusMapEntry {
  return statusMapEntry(phase, unterstatus) ?? unknownStatusEntry(unterstatus)
}

/** Kanonisches Label (Vollform); Default-Zweig = unknownStatusEntry. */
export function statusLabel(
  phase: VorgangPhaseKey,
  unterstatus: string
): string {
  return statusMapEntryOrUnknown(phase, unterstatus).label
}

/** Kurzlabel wenn definiert, sonst Vollform; Default = unknownStatusEntry. */
export function statusShortLabel(
  phase: VorgangPhaseKey,
  unterstatus: string
): string {
  const entry = statusMapEntry(phase, unterstatus)
  if (!entry) return unknownStatusEntry(unterstatus).label
  return entry.shortLabel ?? entry.label
}

/** Alias für Vorgänge-Liste / Resolver. */
export function unterstatusLabelFromMap(
  phase: VorgangPhaseKey,
  unterstatus: string
): string {
  return statusLabel(phase, unterstatus)
}

export const PHASE_UNTERSTATUS_VALUES: Record<VorgangPhaseKey, readonly string[]> = {
  anfrage: ['neu', 'kontaktiert', 'termin', 'abgebrochen', 'storniert', 'hm_erledigt', 'abgeschlossen'],
  angebot: [
    'entwurf',
    'gesendet_handwerker',
    'handwerker_akzeptiert',
    'gesendet_kunde',
    'gesendet',
    'angenommen',
    'abgelehnt',
    'abgelaufen',
    'ersetzt',
    'storniert',
  ],
  auftrag: ['offen', 'in_arbeit', 'abnahme', 'abgeschlossen', 'storniert'],
  rechnung: [
    'ausstehend',
    'entwurf',
    'gesendet',
    'bezahlt',
    'storniert',
    'korrektur_entwurf',
    'korrektur_gespeichert',
    'korrektur_versendet',
  ],
}
