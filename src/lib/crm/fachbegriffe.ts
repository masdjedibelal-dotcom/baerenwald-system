/**
 * CRM-Fachbegriffe — kurze Erklärungen für Staff-UI (Tooltips / Hints).
 * Keine Kunden-Sprache; intern Du.
 */

export const FACHBEGRIFFE = {
  bestand:
    'Wiederkehrende Aufträge (z. B. Wartung, Winterdienst) — nicht einmalige Projekte.',
  satellit:
    'Abschlag- oder Schlussrechnung zu einem Auftrag — eigener Rechnungs-Eintrag, der Auftrag bleibt der Stamm.',
  ohne_vorgang:
    'Direktrechnung ohne Anfrage oder Auftrag — nur Kunde + Rechnung.',
  regie:
    'Abrechnung nach Aufwand (Stunden/Material), oft bei Notfall — nicht Festpreis-LV.',
  abschlag:
    'Teilrechnung zum Auftrag (Rate). Der Auftrag bleibt; die Rechnung hängt als Satellit dran.',
  schlussrechnung:
    'Letzte Rechnung zum Auftrag — schließt offene Raten und Restbetrag ab.',
  notfall:
    'Direkter Auftrag ohne Angebot — typisch mit Regie-Leistung „Notfalleinsatz“.',
  freigabe:
    'Org-/HV-Freigabe bevor ein Angebot beauftragt werden darf (Schwellenregel).',
} as const

export type FachbegriffKey = keyof typeof FACHBEGRIFFE

export function fachbegriff(key: FachbegriffKey): string {
  return FACHBEGRIFFE[key]
}
