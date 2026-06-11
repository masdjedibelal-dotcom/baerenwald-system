import { GROESSEN_CONFIG } from '@/lib/vorab-formular-config'

/** Menge in Angebot, Rechnung, Projekt-Leistungen */
export const POSITION_MENGE_EINHEITEN = [
  'Stück',
  'Stk.',
  'm²',
  'm',
  'lfm',
  'lfd. m',
  'h',
  'Std.',
  'Tag',
  'pauschal',
  'kg',
] as const

/** Größenangaben (Anfrage / Vorab) */
export const GROESSEN_EINHEITEN = ['m²', 'lfm', 'lfd. m', 'Stück'] as const

export type GroessenEinheit = (typeof GROESSEN_EINHEITEN)[number]

export function groesseEinheitLabel(einheit: string): string {
  if (einheit === 'lfm') return 'lfm (Laufmeter)'
  return einheit
}

export function defaultGroesseEinheit(bereich: string, fallback = 'm²'): string {
  return GROESSEN_CONFIG[bereich]?.einheit ?? fallback
}

export function isMengeEinheitFlaeche(einheit: string): boolean {
  const e = einheit.trim().toLowerCase()
  return e === 'm²' || e === 'm2'
}

export function isMengeEinheitLaenge(einheit: string): boolean {
  const e = einheit.trim().toLowerCase()
  return e === 'lfm' || e === 'lfd. m' || e === 'lfd.m' || e === 'm'
}

export function isMengeEinheitMengeMalEinheitspreis(einheit: string): boolean {
  return isMengeEinheitFlaeche(einheit) || isMengeEinheitLaenge(einheit)
}
