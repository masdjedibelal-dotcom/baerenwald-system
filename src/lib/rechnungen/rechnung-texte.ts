import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

/** Standard-Einleitung im Rechnungs-PDF (nach der Anrede, vor der Positionstabelle). */
export const RECHNUNG_EINLEITUNG_STANDARD: Record<AngebotMailAnrede, string> = {
  sie: 'Hiermit stellen wir Ihnen die nachstehend aufgeführten Leistungen in Rechnung.',
  du: 'Hiermit stellen wir dir die nachstehend aufgeführten Leistungen in Rechnung.',
}

/** Frei editierbarer Hinweisblock im Wizard (z. B. Fachbetrieb / Koordination). */
export const RECHNUNG_HINWEISE_STANDARD =
  'Sofern Fachgewerke von Partner-Fachbetrieben ausgeführt wurden, erfolgte die Ausführung unter Projektkoordination von Bärenwald München.'

/** Kurzer Abschluss nach Zahlungsbedingungen und Bankverbindung. */
export const RECHNUNG_SCHLUSS_STANDARD: Record<AngebotMailAnrede, string> = {
  sie: 'Vielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit.',
  du: 'Vielen Dank für dein Vertrauen und die angenehme Zusammenarbeit.',
}

export function defaultRechnungEinleitung(anrede: AngebotMailAnrede = 'sie'): string {
  return RECHNUNG_EINLEITUNG_STANDARD[anrede]
}

export function defaultRechnungHinweise(): string {
  return RECHNUNG_HINWEISE_STANDARD
}

export function resolveRechnungEinleitung(
  text: string | null | undefined,
  anrede: AngebotMailAnrede = 'sie'
): string {
  const t = text?.trim()
  if (t) return t
  return defaultRechnungEinleitung(anrede)
}
