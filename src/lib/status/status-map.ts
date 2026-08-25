/**
 * Kanonische Status-Map (eine Quelle für Labels).
 * Leitfaden §3 / PATTERN-LEITFADEN: Label + optional Kurzlabel.
 *
 * Verboten als UI-Wortlaut: „Fertig“, „Versendet“, „Gesendet HW“,
 * „In Arbeit“ für Auftrag `offen`, „Gesendet Handwerker“.
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
  neu: { label: 'Neu' },
  kontaktiert: { label: 'Kontaktiert' },
  termin: { label: 'Termin' },
  angebot: { label: 'Angebot' },
  auftrag: { label: 'Auftrag' },
  abgeschlossen: { label: 'Abgeschlossen' },
  abgebrochen: { label: 'Verloren' },
  storniert: { label: 'Storniert' },
} as const satisfies Record<string, StatusMapEntry>

/** Angebot — Fein- + Einfach-Status */
export const ANGEBOT_STATUS_MAP = {
  entwurf: { label: 'Entwurf' },
  gesendet_handwerker: { label: 'An Partner gesendet', shortLabel: 'An Partner' },
  handwerker_akzeptiert: { label: 'Partner akzeptiert', shortLabel: 'Akzeptiert' },
  gesendet_kunde: { label: 'Gesendet', shortLabel: 'Gesendet' },
  gesendet: { label: 'Gesendet' },
  angenommen: { label: 'Angenommen' },
  kunde_akzeptiert: { label: 'Angenommen' },
  abgelehnt: { label: 'Abgelehnt' },
  abgelaufen: { label: 'Abgelaufen' },
  ersetzt: { label: 'Ersetzt' },
  storniert: { label: 'Storniert' },
} as const satisfies Record<string, StatusMapEntry>

/** Auftrag */
export const AUFTRAG_STATUS_MAP = {
  offen: { label: 'Offen' },
  in_arbeit: { label: 'In Arbeit' },
  abnahme: { label: 'Abnahme' },
  abgeschlossen: { label: 'Abgeschlossen' },
  storniert: { label: 'Storniert' },
} as const satisfies Record<string, StatusMapEntry>

/** Rechnung */
export const RECHNUNG_STATUS_MAP = {
  ausstehend: { label: 'Offen' },
  entwurf: { label: 'Entwurf' },
  gesendet: { label: 'Gesendet' },
  bezahlt: { label: 'Bezahlt' },
  storniert: { label: 'Storniert' },
  korrektur_entwurf: { label: 'Korrektur Entwurf' },
  korrektur_gespeichert: { label: 'Korrektur Gespeichert' },
  korrektur_versendet: { label: 'Korrektur Gesendet' },
  ueberfaellig: { label: 'Überfällig' },
  ueberwiesen: { label: 'Überwiesen' },
} as const satisfies Record<string, StatusMapEntry>

const PHASE_MAPS: Record<VorgangPhaseKey, Record<string, StatusMapEntry>> = {
  anfrage: ANFRAGE_STATUS_MAP,
  angebot: ANGEBOT_STATUS_MAP,
  auftrag: AUFTRAG_STATUS_MAP,
  rechnung: RECHNUNG_STATUS_MAP,
}

export function statusMapEntry(
  phase: VorgangPhaseKey,
  unterstatus: string
): StatusMapEntry | null {
  const key = unterstatus.trim().toLowerCase()
  return PHASE_MAPS[phase][key] ?? null
}

/** Kanonisches Label (Vollform). */
export function statusLabel(
  phase: VorgangPhaseKey,
  unterstatus: string
): string {
  const entry = statusMapEntry(phase, unterstatus)
  if (entry) return entry.label
  return unterstatus.trim() || '—'
}

/** Kurzlabel wenn definiert, sonst Vollform. */
export function statusShortLabel(
  phase: VorgangPhaseKey,
  unterstatus: string
): string {
  const entry = statusMapEntry(phase, unterstatus)
  if (!entry) return unterstatus.trim() || '—'
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
  anfrage: ['neu', 'kontaktiert', 'termin', 'abgebrochen', 'storniert'],
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
