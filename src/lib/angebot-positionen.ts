import type { AngebotPosition } from '@/lib/types'

export function neuePositionsId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Erkennt gespeicherte Positionen ohne Lohn/Material-Aufteilung (Altbestand). */
function istLegacyPosition(r: Record<string, unknown>): boolean {
  return (
    typeof r.preis_min === 'number' ||
    typeof r.preis_max === 'number' ||
    (r.preis_min != null && r.lohn_min == null)
  )
}

/**
 * Einheitliche Position inkl. Alt-Daten (preis_min/max → komplett Lohn).
 * `gesamt_*` = Stückpreise (pro Einheit), Zeilensumme = × menge.
 */
export function normalizeAngebotPosition(
  raw: unknown,
  gewerkNameFallback = ''
): AngebotPosition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const gewerk_id = String(r.gewerk_id ?? '')
  const gewerk_name = String(r.gewerk_name ?? gewerkNameFallback)
  const leistung = String(r.leistung ?? '')
  const einheit = String(r.einheit ?? 'Stk.')
  const menge = Math.max(Number(r.menge) || 0, 0.0001)
  const id = String(r.id ?? neuePositionsId())

  if (!gewerk_id && !leistung) return null

  let lohn_min = Number(r.lohn_min)
  let lohn_max = Number(r.lohn_max)
  let material_min = Number(r.material_min)
  let material_max = Number(r.material_max)

  if (istLegacyPosition(r)) {
    const pm = Number(r.preis_min) || 0
    const px = Number(r.preis_max) || 0
    lohn_min = Number.isFinite(lohn_min) ? lohn_min : pm
    lohn_max = Number.isFinite(lohn_max) ? lohn_max : px
    material_min = Number.isFinite(material_min) ? material_min : 0
    material_max = Number.isFinite(material_max) ? material_max : 0
  } else {
    lohn_min = Number.isFinite(lohn_min) ? lohn_min : 0
    lohn_max = Number.isFinite(lohn_max) ? lohn_max : 0
    material_min = Number.isFinite(material_min) ? material_min : 0
    material_max = Number.isFinite(material_max) ? material_max : 0
  }

  const beschreibung = String(r.beschreibung ?? leistung ?? gewerk_name).trim() || leistung
  const gesamt_min = lohn_min + material_min
  const gesamt_max = lohn_max + material_max

  const einkaufspreis_min =
    r.einkaufspreis_min != null && r.einkaufspreis_min !== ''
      ? Number(r.einkaufspreis_min)
      : undefined
  const einkaufspreis_max =
    r.einkaufspreis_max != null && r.einkaufspreis_max !== ''
      ? Number(r.einkaufspreis_max)
      : undefined

  const notiz_intern =
    r.notiz_intern != null && String(r.notiz_intern).trim()
      ? String(r.notiz_intern).trim()
      : undefined
  const notiz_extern =
    r.notiz_extern != null && String(r.notiz_extern).trim()
      ? String(r.notiz_extern).trim()
      : r.notiz != null && String(r.notiz).trim()
        ? String(r.notiz).trim()
        : undefined

  return {
    id,
    gewerk_id,
    gewerk_name,
    leistung,
    beschreibung,
    lohn_min,
    lohn_max,
    material_min,
    material_max,
    gesamt_min,
    gesamt_max,
    menge,
    einheit,
    einkaufspreis_min: Number.isFinite(einkaufspreis_min) ? einkaufspreis_min : undefined,
    einkaufspreis_max: Number.isFinite(einkaufspreis_max) ? einkaufspreis_max : undefined,
    notiz_intern,
    notiz_extern,
  }
}

export function normalizeAngebotPositionen(raw: unknown): AngebotPosition[] {
  if (!Array.isArray(raw)) return []
  const out: AngebotPosition[] = []
  for (const item of raw) {
    const p = normalizeAngebotPosition(item)
    if (p) out.push(p)
  }
  return out
}

export type AngebotSummen = {
  lohnZeileMin: number
  lohnZeileMax: number
  materialZeileMin: number
  materialZeileMax: number
  nettoMin: number
  nettoMax: number
  mwstSatz: number
  mwstBetragMin: number
  mwstBetragMax: number
  bruttoMin: number
  bruttoMax: number
  einkaufZeileMin: number
  einkaufZeileMax: number
  margeMin: number
  margeMax: number
}

export function summenAusPositionen(
  positionen: AngebotPosition[],
  mwstSatz = 19
): AngebotSummen {
  let lohnZeileMin = 0
  let lohnZeileMax = 0
  let materialZeileMin = 0
  let materialZeileMax = 0
  let einkaufZeileMin = 0
  let einkaufZeileMax = 0

  for (const p of positionen) {
    const m = p.menge || 1
    lohnZeileMin += p.lohn_min * m
    lohnZeileMax += p.lohn_max * m
    materialZeileMin += p.material_min * m
    materialZeileMax += p.material_max * m
    const emin = p.einkaufspreis_min
    const emax = p.einkaufspreis_max
    if (emin != null && Number.isFinite(emin)) einkaufZeileMin += emin * m
    if (emax != null && Number.isFinite(emax)) einkaufZeileMax += emax * m
  }

  const nettoMin = lohnZeileMin + materialZeileMin
  const nettoMax = lohnZeileMax + materialZeileMax
  const f = mwstSatz / 100
  const mwstBetragMin = nettoMin * f
  const mwstBetragMax = nettoMax * f
  const bruttoMin = nettoMin + mwstBetragMin
  const bruttoMax = nettoMax + mwstBetragMax

  const margeMin = nettoMin - einkaufZeileMax
  const margeMax = nettoMax - einkaufZeileMin

  return {
    lohnZeileMin,
    lohnZeileMax,
    materialZeileMin,
    materialZeileMax,
    nettoMin,
    nettoMax,
    mwstSatz,
    mwstBetragMin,
    mwstBetragMax,
    bruttoMin,
    bruttoMax,
    einkaufZeileMin,
    einkaufZeileMax,
    margeMin,
    margeMax,
  }
}

/** Zeilensumme Netto Min/Max (ohne MwSt) */
export function zeilenNettoMinMax(p: AngebotPosition): { min: number; max: number } {
  const m = p.menge || 1
  return {
    min: p.gesamt_min * m,
    max: p.gesamt_max * m,
  }
}
