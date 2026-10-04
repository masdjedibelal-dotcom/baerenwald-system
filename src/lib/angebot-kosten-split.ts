import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Preisliste } from '@/lib/types'

export type KostenartZeile = 'leistung' | 'anfahrt'

/**
 * Kostenzuordnung pro Position:
 * - allgemein: keine Aufteilung Lohn/Material (nur Gesamtpreis; kein Ausweis im PDF)
 * - lohn / material: 100 % in eine Kategorie (wird im PDF ausgewiesen)
 */
export type KostenVerteilung = 'allgemein' | 'lohn' | 'material'

/** Netto-Stückpreis → Lohn + Material (Summe = netto). */
export function splitNettoStueck(
  nettoStueck: number,
  opts: {
    firm: FirmenEinstellungen
    leistung?: string
    kostenart?: KostenartZeile
    kostenverteilung?: KostenVerteilung
    preisliste?: Preisliste | null
  }
): { lohn_netto: number; material_netto: number } {
  const netto = Math.max(0, Math.round(nettoStueck * 100) / 100)
  if (netto <= 0) return { lohn_netto: 0, material_netto: 0 }
  if (opts.kostenart === 'anfahrt' || opts.kostenverteilung === 'lohn') {
    return { lohn_netto: netto, material_netto: 0 }
  }
  if (opts.kostenverteilung === 'material') {
    return { lohn_netto: 0, material_netto: netto }
  }
  /* allgemein: kein Standard-Split — voller Betrag intern auf Lohn, Material 0 */
  return { lohn_netto: netto, material_netto: 0 }
}
