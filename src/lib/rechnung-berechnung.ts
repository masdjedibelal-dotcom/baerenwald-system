import { ZEILE_SLUG_FREITEXT, ZEILE_SLUG_GESAMTRABATT, istPreisPosition } from '@/lib/dokument-zeilen'
import type { AngebotPosition } from '@/lib/types'

export type MwstAufschluesselungZeile = {
  satz: number
  netto: number
  mwst: number
}

export type RechnungBerechnungOptionen = {
  kleinunternehmer?: boolean
  reverseCharge13b?: boolean
  defaultMwstSatz?: number
}

export type RechnungBerechnung = {
  lohn_netto: number
  material_netto: number
  netto: number
  mwst_betrag: number
  brutto: number
  /** Repräsentativer Satz (höchster positiver oder 0) */
  mwst_satz: number
  mwst_aufschluesselung: MwstAufschluesselungZeile[]
  kleinunternehmer: boolean
  reverse_charge_13b: boolean
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function istSonderzeile(p: AngebotPosition): boolean {
  const slug = p.gewerk_slug ?? ''
  return slug === ZEILE_SLUG_FREITEXT || slug === ZEILE_SLUG_GESAMTRABATT
}

function istAbschlagAbzugZeile(p: AngebotPosition): boolean {
  const slug = (p.gewerk_slug ?? '').toLowerCase()
  if (slug === 'abschlag_abzug') return true
  return (p.leistung ?? '').toLowerCase().startsWith('abzüglich')
}

export function positionNettoZeile(p: AngebotPosition): number {
  const m = p.menge || 1
  return round2((p.lohn_netto + p.material_netto) * m)
}

export function effectiveMwstSatzPosition(
  p: AngebotPosition,
  opts: RechnungBerechnungOptionen
): number {
  if (opts.kleinunternehmer || opts.reverseCharge13b) return 0
  const s = p.mwst_satz
  if (s === 0 || s === 7 || s === 19) return s
  return opts.defaultMwstSatz ?? 19
}

/**
 * Rechnungssummen inkl. MwSt je Satz (0/7/19), §19 Kleinunternehmer, §13b Reverse Charge.
 */
export function berechneRechnung(
  positionen: AngebotPosition[],
  opts: RechnungBerechnungOptionen = {}
): RechnungBerechnung {
  const kleinunternehmer = Boolean(opts.kleinunternehmer)
  const reverse_charge_13b = Boolean(opts.reverseCharge13b)
  const defaultMwst = opts.defaultMwstSatz ?? 19

  let lohn_netto = 0
  let material_netto = 0
  const nettoBySatz = new Map<number, number>()

  for (const p of positionen) {
    const m = p.menge || 1
    const l = round2(p.lohn_netto * m)
    const mat = round2(p.material_netto * m)
    // Abzugszeilen (bereits gestellte Abschläge) nicht in Lohn/Material-Aufstellung
    if (!istSonderzeile(p) && !istAbschlagAbzugZeile(p)) {
      lohn_netto += l
      material_netto += mat
    }
    const netto = round2(l + mat)
    if (Math.abs(netto) < 0.0001) continue
    if (p.gewerk_slug === ZEILE_SLUG_FREITEXT) continue

    const satz = effectiveMwstSatzPosition(p, opts)
    nettoBySatz.set(satz, round2((nettoBySatz.get(satz) ?? 0) + netto))
  }

  const netto = round2(
    Array.from(nettoBySatz.values()).reduce((s, v) => s + v, 0)
  )

  if (kleinunternehmer || reverse_charge_13b) {
    return {
      lohn_netto: round2(lohn_netto),
      material_netto: round2(material_netto),
      netto,
      mwst_betrag: 0,
      brutto: netto,
      mwst_satz: 0,
      mwst_aufschluesselung: [{ satz: 0, netto, mwst: 0 }],
      kleinunternehmer,
      reverse_charge_13b,
    }
  }

  const mwst_aufschluesselung: MwstAufschluesselungZeile[] = []
  let mwst_betrag = 0
  const saetze = Array.from(nettoBySatz.keys()).sort((a, b) => b - a)

  for (const satz of saetze) {
    const nettoSatz = nettoBySatz.get(satz) ?? 0
    const mwst = round2(nettoSatz * (satz / 100))
    mwst_aufschluesselung.push({ satz, netto: nettoSatz, mwst })
    mwst_betrag += mwst
  }
  mwst_betrag = round2(mwst_betrag)
  const brutto = round2(netto + mwst_betrag)
  const positiv = saetze.filter((s) => s > 0)
  const mwst_satz = positiv.length ? Math.max(...positiv) : defaultMwst

  return {
    lohn_netto: round2(lohn_netto),
    material_netto: round2(material_netto),
    netto,
    mwst_betrag,
    brutto,
    mwst_satz,
    mwst_aufschluesselung,
    kleinunternehmer: false,
    reverse_charge_13b: false,
  }
}

export function abschlag35aEur(lohnNetto: number): number {
  return round2(lohnNetto * 0.2)
}

export type Hinweis35aAnteil = {
  /**
   * Ausgewiesener §35a-Betrag:
   * - Allgemein (kein Materialsplit) → Brutto dieser Rechnung (inkl. USt, BMF)
   * - Mit Materialsplit → Lohnanteil netto (Rechnungsnetto abzgl. Material)
   */
  lohn_netto: number
  /** Explizit als Material markierte Positionen (netto) */
  material_netto: number
  /** Mindestens eine Position ist explizit „Material“ */
  hat_materialausweis: boolean
  /** true = `lohn_netto` ist Brutto (Allgemein-Fall) */
  ist_brutto: boolean
}

/**
 * § 35a-Lohnanteil:
 * - Alles „Allgemein“ → Rechnungsbrutto als Lohnanteil (Arbeitskosten inkl. USt)
 * - Explizites Material → Rechnungsnetto abzüglich Material; Material wird ausgewiesen
 * - Bei Teilrechnung/Schluss: `rechnungNetto`/`rechnungBrutto` = Betrag dieser Rechnung
 *   (z. B. Rest nach Abschlag); optional `vollNetto` skaliert Material anteilig
 */
export function berechneHinweis35aAnteil(
  positionen: AngebotPosition[] | null | undefined,
  rechnungNetto: number,
  opts?: { vollNetto?: number | null; rechnungBrutto?: number | null }
): Hinweis35aAnteil {
  const netto = round2(Math.max(0, Number(rechnungNetto) || 0))
  const bruttoOpt = Number(opts?.rechnungBrutto)
  const brutto =
    Number.isFinite(bruttoOpt) && bruttoOpt >= 0 ? round2(bruttoOpt) : netto
  let material = 0
  let hatMaterial = false
  for (const p of Array.isArray(positionen) ? positionen : []) {
    if (!istPreisPosition(p)) continue
    const kv = p.kostenverteilung ?? 'allgemein'
    if (kv !== 'material') continue
    hatMaterial = true
    const m = p.menge || 1
    material += (Number(p.material_netto) || 0) * m
  }
  material = round2(material)
  const voll = Number(opts?.vollNetto)
  if (
    hatMaterial &&
    material > 0 &&
    Number.isFinite(voll) &&
    voll > 0.02 &&
    Math.abs(voll - netto) > 0.02
  ) {
    material = round2(material * (netto / voll))
  }
  if (!hatMaterial || material <= 0) {
    const ausweis = brutto > 0 ? brutto : netto
    return {
      lohn_netto: ausweis,
      material_netto: 0,
      hat_materialausweis: false,
      ist_brutto: Math.abs(ausweis - netto) > 0.02,
    }
  }
  return {
    lohn_netto: round2(Math.max(0, netto - material)),
    material_netto: material,
    hat_materialausweis: true,
    ist_brutto: false,
  }
}

/** § 35a-Hinweis auf Rechnungen: nur Privatkunde, positiver Lohnanteil. */
export function rechnungZeigtHinweis35a(
  kundeTyp: string | null | undefined,
  lohnNettoAusgewiesen: number,
  kleinunternehmer: boolean
): boolean {
  if (kleinunternehmer || lohnNettoAusgewiesen <= 0) return false
  return kundeZeigt35a(kundeTyp)
}

/** Gespeicherter Wizard-Wert oder automatische Voreinstellung (ältere Rechnungen ohne Spalte). */
export function resolveRechnungHinweis35a(
  stored: boolean | null | undefined,
  kundeTyp: string | null | undefined,
  lohnNettoAusgewiesen: number,
  kleinunternehmer: boolean
): boolean {
  if (typeof stored === 'boolean') return stored
  return rechnungZeigtHinweis35a(kundeTyp, lohnNettoAusgewiesen, kleinunternehmer)
}

function formatEurDe(n: number): string {
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatHinweis35aRechnung(
  lohnNetto: number,
  opts?: { materialNetto?: number | null }
): string {
  const betrag = formatEurDe(lohnNetto)
  const mat = Number(opts?.materialNetto) || 0
  if (mat > 0) {
    return (
      `Steuerlicher Hinweis gemäß § 35a Abs. 3 EStG: Der ausgewiesene Lohnkostenanteil in Höhe von ${betrag} € ` +
      `(Rechnungsnetto abzüglich ausgewiesener Materialkosten von ${formatEurDe(mat)} €; ` +
      `inkl. Anfahrt und Maschinenkosten, soweit enthalten) ` +
      `kann bei der Einkommensteuer geltend gemacht werden.`
    )
  }
  return (
    `Steuerlicher Hinweis gemäß § 35a Abs. 3 EStG: Der ausgewiesene Lohnkostenanteil in Höhe von ${betrag} € ` +
    `(inkl. USt sowie Anfahrt und Maschinenkosten, soweit enthalten; ohne Materialkosten) ` +
    `kann bei der Einkommensteuer geltend gemacht werden.`
  )
}

export function kundeZeigt35a(typ: string | null | undefined): boolean {
  const t = (typ ?? 'privat').toLowerCase()
  return t === 'privat' || t === '' || t === 'sonstiges'
}

export function kundeKannReverseCharge13b(typ: string | null | undefined): boolean {
  const t = (typ ?? '').toLowerCase()
  return t === 'gewerbe' || t === 'hausverwaltung'
}

export function parseKleinunternehmerSetting(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'ja' || v === 'yes'
}
