import type { AngebotPosition, PreisTyp } from '@/lib/types'

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
function parsePreisTyp(v: unknown): PreisTyp | undefined {
  if (v === 'fix' || v === 'range') return v
  return undefined
}

export function normalizeAngebotPosition(
  raw: unknown,
  gewerkNameFallback = ''
): AngebotPosition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const gewerk_id = String(r.gewerk_id ?? '')
  const gewerk_slug =
    r.gewerk_slug != null && String(r.gewerk_slug).trim() ? String(r.gewerk_slug).trim() : undefined
  const gewerk_name = String(r.gewerk_name ?? gewerkNameFallback)
  const leistungRaw = String(r.leistung ?? '')
  const leistung_name =
    r.leistung_name != null && String(r.leistung_name).trim()
      ? String(r.leistung_name).trim()
      : undefined
  const leistung = leistungRaw || leistung_name || ''
  const leistung_id =
    r.leistung_id != null && String(r.leistung_id).trim() ? String(r.leistung_id).trim() : undefined
  const einheit = String(r.einheit ?? 'Stk.')
  const menge = Math.max(Number(r.menge) || 0, 0.0001)
  const id = String(r.id ?? neuePositionsId())

  if (!gewerk_id && !gewerk_slug && !leistung) return null

  let preis_typ = parsePreisTyp(r.preis_typ)

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

  let lohn_fix =
    r.lohn_fix != null && r.lohn_fix !== '' ? Number(r.lohn_fix) : undefined
  let material_fix =
    r.material_fix != null && r.material_fix !== '' ? Number(r.material_fix) : undefined
  let gesamt_fix =
    r.gesamt_fix != null && r.gesamt_fix !== '' ? Number(r.gesamt_fix) : undefined

  if (!preis_typ) {
    if (
      (lohn_fix != null && Number.isFinite(lohn_fix)) ||
      (material_fix != null && Number.isFinite(material_fix)) ||
      (gesamt_fix != null && Number.isFinite(gesamt_fix))
    ) {
      preis_typ = 'fix'
    } else {
      preis_typ = 'range'
    }
  }

  if (preis_typ === 'fix') {
    const lf = lohn_fix != null && Number.isFinite(lohn_fix) ? lohn_fix : undefined
    const mf = material_fix != null && Number.isFinite(material_fix) ? material_fix : undefined
    const gf = gesamt_fix != null && Number.isFinite(gesamt_fix) ? gesamt_fix : undefined
    if (lf == null && mf == null && gf != null) {
      lohn_min = gf
      lohn_max = gf
      material_min = 0
      material_max = 0
    } else {
      lohn_min = lf ?? 0
      lohn_max = lf ?? 0
      material_min = mf ?? 0
      material_max = mf ?? 0
    }
    lohn_fix = lohn_min
    material_fix = material_min
    gesamt_fix = lohn_min + material_min
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
  const einkaufspreisSingle =
    r.einkaufspreis != null && r.einkaufspreis !== '' ? Number(r.einkaufspreis) : undefined

  const marge = r.marge != null && r.marge !== '' ? Number(r.marge) : undefined

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

  const handwerker_id =
    r.handwerker_id != null && String(r.handwerker_id).trim()
      ? String(r.handwerker_id).trim()
      : undefined
  const handwerker_name =
    r.handwerker_name != null && String(r.handwerker_name).trim()
      ? String(r.handwerker_name).trim()
      : undefined

  const out: AngebotPosition = {
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
    preis_typ,
  }
  if (gewerk_slug) out.gewerk_slug = gewerk_slug
  if (leistung_id) out.leistung_id = leistung_id
  if (leistung_name) out.leistung_name = leistung_name
  if (preis_typ === 'fix') {
    out.lohn_fix = lohn_fix
    out.material_fix = material_fix
    out.gesamt_fix = gesamt_fix
  }
  if (Number.isFinite(einkaufspreisSingle)) out.einkaufspreis = einkaufspreisSingle
  if (marge != null && Number.isFinite(marge)) out.marge = marge
  if (handwerker_id) out.handwerker_id = handwerker_id
  if (handwerker_name) out.handwerker_name = handwerker_name
  return out
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

function zeilenLohnMaterial(p: AngebotPosition): {
  lohnMin: number
  lohnMax: number
  matMin: number
  matMax: number
} {
  const m = p.menge || 1
  const typ = p.preis_typ ?? 'range'
  if (typ === 'fix') {
    const lu = p.lohn_fix
    const mu = p.material_fix
    const gu = p.gesamt_fix
    if ((lu == null || !Number.isFinite(lu)) && (mu == null || !Number.isFinite(mu)) && gu != null && Number.isFinite(gu)) {
      return { lohnMin: gu * m, lohnMax: gu * m, matMin: 0, matMax: 0 }
    }
    const l = lu != null && Number.isFinite(lu) ? lu : p.lohn_min
    const mat = mu != null && Number.isFinite(mu) ? mu : p.material_min
    return {
      lohnMin: l * m,
      lohnMax: l * m,
      matMin: mat * m,
      matMax: mat * m,
    }
  }
  return {
    lohnMin: p.lohn_min * m,
    lohnMax: p.lohn_max * m,
    matMin: p.material_min * m,
    matMax: p.material_max * m,
  }
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
    const z = zeilenLohnMaterial(p)
    lohnZeileMin += z.lohnMin
    lohnZeileMax += z.lohnMax
    materialZeileMin += z.matMin
    materialZeileMax += z.matMax
    const m = p.menge || 1
    const ez = p.einkaufspreis
    if (ez != null && Number.isFinite(ez)) {
      einkaufZeileMin += ez * m
      einkaufZeileMax += ez * m
    } else {
      const emin = p.einkaufspreis_min
      const emax = p.einkaufspreis_max
      if (emin != null && Number.isFinite(emin)) einkaufZeileMin += emin * m
      if (emax != null && Number.isFinite(emax)) einkaufZeileMax += emax * m
    }
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

/** Aggregierte Netto-Summen für DB-Felder / Editor-Zusammenfassung */
export function berechneGesamt(positionen: AngebotPosition[]) {
  const pos = normalizeAngebotPositionen(positionen)
  const s = summenAusPositionen(pos, 19)
  return {
    lohn_netto: s.lohnZeileMin,
    material_netto: s.materialZeileMin,
    gesamt_min: s.nettoMin,
    gesamt_max: s.nettoMax,
    summen: s,
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
