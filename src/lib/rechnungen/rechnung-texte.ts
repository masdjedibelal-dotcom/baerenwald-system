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

const LEGACY_EINLEITUNG_VARIANTEN = [
  'Die Leistungen wurden vertragsgemäß erbracht und abgeschlossen.',
  'hiermit stellen wir Ihnen die erbrachten Leistungen in Rechnung.',
  'hiermit stellen wir dir die erbrachten Leistungen in Rechnung.',
  'hiermit stellen wir Ihnen die nachfolgend aufgeführten, von uns vertragsgemäß erbrachten Leistungen in Rechnung.',
  'hiermit stellen wir dir die nachfolgend aufgeführten, von uns vertragsgemäß erbrachten Leistungen in Rechnung.',
] as const

export function defaultRechnungEinleitung(anrede: AngebotMailAnrede = 'sie'): string {
  return RECHNUNG_EINLEITUNG_STANDARD[anrede]
}

export function defaultRechnungHinweise(): string {
  return RECHNUNG_HINWEISE_STANDARD
}

export function defaultRechnungSchluss(anrede: AngebotMailAnrede = 'sie'): string {
  return RECHNUNG_SCHLUSS_STANDARD[anrede]
}

export function resolveRechnungEinleitung(
  text: string | null | undefined,
  anrede: AngebotMailAnrede = 'sie'
): string {
  const t = text?.trim()
  if (t) return t
  return defaultRechnungEinleitung(anrede)
}

/** Erkennt alte Wizard-Standards — beim Anrede-Wechsel kann neu vorausgefüllt werden. */
export function isLegacyRechnungEinleitung(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (LEGACY_EINLEITUNG_VARIANTEN.some((v) => v === t)) return true
  return Object.values(RECHNUNG_EINLEITUNG_STANDARD).some((v) => v === t)
}
