import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Preisliste } from '@/lib/types'

/** Leistungen mit hohem Materialanteil → niedrigerer Lohnanteil. */
const MATERIAL_HEAVY =
  /fliesen|material|estrich|parkett|laminat|vinyl|sanitär|armatur|wdvs|dämm|flies|bodenbelag|verputz/i

export type KostenartZeile = 'leistung' | 'anfahrt'

/**
 * Kostenzuordnung pro Position:
 * - allgemein: keine Aufteilung Lohn/Material (nur Gesamtpreis; kein Ausweis im PDF)
 * - lohn / material: 100 % in eine Kategorie (wird im PDF ausgewiesen)
 */
export type KostenVerteilung = 'allgemein' | 'lohn' | 'material'

export const KOSTEN_VERTEILUNG_LABELS: Record<KostenVerteilung, string> = {
  allgemein: 'Allgemein',
  lohn: 'Arbeitskosten',
  material: 'Materialkosten',
}

function numSetting(raw: string | undefined, fallback: number): number {
  const n = parseFloat(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

/** Standard-Lohnanteil in % (Rest = Material) — Einstellungen → Firma. */
export function standardLohnAnteilProzent(firm: FirmenEinstellungen): number {
  const p = numSetting(firm.lohn_anteil_standard_prozent, 75)
  return Math.min(100, Math.max(0, p))
}

/**
 * Lohnanteil 0–100 für automatische Aufteilung (§ 35a / Materialausweis).
 * Anfahrt = 100 % Lohn (kein Material).
 */
export function lohnAnteilProzent(opts: {
  firm: FirmenEinstellungen
  leistung?: string
  kostenart?: KostenartZeile
  preisliste?: Preisliste | null
}): number {
  if (opts.kostenart === 'anfahrt') return 100

  let pct = standardLohnAnteilProzent(opts.firm)
  const text = `${opts.leistung ?? ''} ${opts.preisliste?.leistung ?? ''}`.trim()
  if (text && MATERIAL_HEAVY.test(text)) {
    pct = Math.min(pct, 45)
  }
  return pct
}

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
