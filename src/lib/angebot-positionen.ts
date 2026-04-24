import type {
  AngebotHandwerkerZuweisungInput,
  AngebotPosition,
  PreisTyp,
} from '@/lib/types'

export function neuePositionsId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Alt-JSON mit preis_min/max (ohne Lohn-Netto-Feld). */
function istLegacyPosition(r: Record<string, unknown>): boolean {
  return r.preis_min != null || r.preis_max != null
}

function parsePreisTyp(v: unknown): PreisTyp | undefined {
  if (v === 'fix' || v === 'range') return v
  return undefined
}

/** Mittelwert zweier Kanten (Legacy Min/Max) → ein Festpreis */
function mittelOderMax(a: number, b: number): number {
  if (a > 0 && b > 0) return Math.round(((a + b) / 2) * 100) / 100
  return Math.max(a, b, 0)
}

/**
 * Einheitliche Position inkl. Alt-JSON (lohn_min/max, preis_min/max → lohn_netto/material_netto).
 */
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

  let lohn_netto = num(r.lohn_netto)
  if (lohn_netto <= 0 && (r.lohn_netto == null || r.lohn_netto === '')) {
    const lmin = num(r.lohn_min)
    const lmax = num(r.lohn_max)
    if (lmin > 0 || lmax > 0) {
      lohn_netto = mittelOderMax(lmin, lmax)
    } else if (istLegacyPosition(r)) {
      const pm = num(r.preis_min)
      const px = num(r.preis_max)
      lohn_netto = mittelOderMax(pm, px)
    } else {
      const lf = num(r.lohn_fix)
      const gf = num(r.gesamt_fix)
      const mf = num(r.material_fix)
      if (lf > 0 || mf > 0) {
        lohn_netto = lf > 0 ? lf : 0
      } else if (gf > 0 && mf <= 0) {
        lohn_netto = gf
      } else {
        lohn_netto = 0
      }
    }
  }
  if (lohn_netto < 0) lohn_netto = 0

  let material_netto = num(r.material_netto)
  if (material_netto <= 0 && (r.material_netto == null || r.material_netto === '')) {
    const mmin = num(r.material_min)
    const mmax = num(r.material_max)
    if (mmin > 0 || mmax > 0) {
      material_netto = mittelOderMax(mmin, mmax)
    } else {
      const mf = num(r.material_fix)
      const gf = num(r.gesamt_fix)
      const lf = num(r.lohn_fix)
      if (mf > 0) material_netto = mf
      else if (gf > 0 && lf <= 0) material_netto = gf
      else material_netto = 0
    }
  }
  if (material_netto < 0) material_netto = 0

  const gesamt_unit = Math.round((lohn_netto + material_netto) * 100) / 100

  let einkaufspreis: number | undefined
  const ekSingle = r.einkaufspreis
  if (ekSingle != null && ekSingle !== '') {
    const e = num(ekSingle)
    if (e > 0) einkaufspreis = e
  }
  if (einkaufspreis == null) {
    const emin = num(r.einkaufspreis_min)
    const emax = num(r.einkaufspreis_max)
    if (emin > 0 || emax > 0) einkaufspreis = mittelOderMax(emin, emax) || undefined
  }

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

  const beschreibung = String(r.beschreibung ?? leistung ?? gewerk_name).trim() || leistung
  const preis_typ = parsePreisTyp(r.preis_typ) ?? 'fix'

  const out: AngebotPosition = {
    id,
    gewerk_id,
    gewerk_name,
    leistung,
    beschreibung,
    lohn_netto,
    material_netto,
    gesamt_min: gesamt_unit,
    gesamt_max: gesamt_unit,
    menge,
    einheit,
    notiz_intern,
    notiz_extern,
    preis_typ,
  }
  if (gewerk_slug) out.gewerk_slug = gewerk_slug
  if (leistung_id) out.leistung_id = leistung_id
  if (leistung_name) out.leistung_name = leistung_name
  if (einkaufspreis != null && einkaufspreis > 0) out.einkaufspreis = einkaufspreis
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

/** Queues aus alter angebot_handwerker-Liste in Positionen einsortieren (Reihenfolge pro Gewerk). */
export function mergeHandwerkerQueuesIntoPositionen(
  positionen: AngebotPosition[],
  zuweisungen: { gewerk_id: string; handwerker_id: string }[]
): AngebotPosition[] {
  const queues = new Map<string, string[]>()
  for (const z of zuweisungen) {
    if (!z.gewerk_id?.trim() || !z.handwerker_id?.trim()) continue
    const q = queues.get(z.gewerk_id) ?? []
    q.push(z.handwerker_id)
    queues.set(z.gewerk_id, q)
  }
  const copy = new Map(Array.from(queues.entries()).map(([k, v]) => [k, [...v]]))
  return positionen.map((p) => {
    if (p.handwerker_id?.trim()) return p
    const q = copy.get(p.gewerk_id)
    if (!q?.length) return p
    const hid = q.shift()!
    if (!q.length) copy.delete(p.gewerk_id)
    else copy.set(p.gewerk_id, q)
    return { ...p, handwerker_id: hid }
  })
}

export function handwerkerZuweisungenFromPositionen(
  positionen: AngebotPosition[]
): AngebotHandwerkerZuweisungInput[] {
  const out: AngebotHandwerkerZuweisungInput[] = []
  const seen = new Set<string>()
  for (const p of positionen) {
    const hid = p.handwerker_id?.trim()
    const gid = p.gewerk_id?.trim()
    if (!hid || !gid) continue
    const key = `${gid}:${hid}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      gewerk_id: gid,
      handwerker_id: hid,
      status: 'ausstehend',
    })
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

function zeileEinkauf(p: AngebotPosition): { min: number; max: number } {
  const m = p.menge || 1
  const ek = p.einkaufspreis
  if (ek != null && Number.isFinite(ek) && ek > 0) {
    const z = ek * m
    return { min: z, max: z }
  }
  return { min: 0, max: 0 }
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
    const l = p.lohn_netto * m
    const mat = p.material_netto * m
    lohnZeileMin += l
    lohnZeileMax += l
    materialZeileMin += mat
    materialZeileMax += mat
    const ek = zeileEinkauf(p)
    einkaufZeileMin += ek.min
    einkaufZeileMax += ek.max
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

/** Zeilensumme Netto (ohne MwSt) */
export function zeilenNettoMinMax(p: AngebotPosition): { min: number; max: number } {
  const m = p.menge || 1
  const z = (p.lohn_netto + p.material_netto) * m
  return { min: z, max: z }
}

export function positionNettoZeile(p: AngebotPosition): number {
  const { min } = zeilenNettoMinMax(p)
  return min
}
