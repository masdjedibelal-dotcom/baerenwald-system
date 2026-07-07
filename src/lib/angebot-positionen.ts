import { GEWERK_SLUG_ANFAHRT } from '@/lib/anfahrt-angebot'
import { istPreisPosition } from '@/lib/dokument-zeilen'
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

function parseKostenverteilung(
  v: unknown
): 'allgemein' | 'lohn' | 'material' | undefined {
  if (v === 'allgemein' || v === 'lohn' || v === 'material') return v
  return undefined
}

/** Zeilensumme netto aus gespeicherten Feldern (Wizard = Line total, Legacy normalize = Stück). */
function gesamtZeileMinMax(
  r: Record<string, unknown>,
  gesamtStueck: number,
  menge: number,
  preis_typ: PreisTyp
): { min: number; max: number } {
  const lineFromParts = Math.round(gesamtStueck * menge * 100) / 100
  const rawMin = num(r.gesamt_min)
  const rawMax = num(r.gesamt_max)
  if (rawMin <= 0 && rawMax <= 0) {
    return { min: lineFromParts, max: lineFromParts }
  }
  const minCand = rawMin > 0 ? rawMin : rawMax
  const maxCand = rawMax > 0 ? rawMax : minCand
  const looksLikeStueckGespeichert =
    menge > 1 &&
    gesamtStueck > 0 &&
    Math.abs(minCand - gesamtStueck) < 0.02 &&
    Math.abs(minCand - lineFromParts) > 0.02
  if (looksLikeStueckGespeichert) {
    const maxStueck = Math.abs(maxCand - minCand) > 0.02 ? maxCand : gesamtStueck
    return {
      min: lineFromParts,
      max: Math.round(maxStueck * menge * 100) / 100,
    }
  }
  if (preis_typ === 'range' && maxCand > minCand) {
    return { min: minCand, max: maxCand }
  }
  if (lineFromParts > 0 && rawMin > 0 && rawMin < lineFromParts - 0.02) {
    return {
      min: lineFromParts,
      max: Math.max(lineFromParts, maxCand > minCand ? maxCand : lineFromParts),
    }
  }
  return { min: minCand, max: maxCand }
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
      const vk = num(r.vk_netto)
      if (vk > 0) {
        lohn_netto = vk
      } else {
        const pm = num(r.preis_min)
        const px = num(r.preis_max)
        const line = mittelOderMax(pm, px)
        lohn_netto = menge > 1 ? Math.round((line / menge) * 100) / 100 : line
      }
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

  const beschRaw = r.beschreibung != null ? String(r.beschreibung).trim() : ''
  const beschreibung = beschRaw && beschRaw !== leistung ? beschRaw : ''
  const preis_typ = parsePreisTyp(r.preis_typ) ?? 'fix'
  const vkRaw = num(r.vk_netto)
  const unitFromParts = Math.round((lohn_netto + material_netto) * 100) / 100
  const rawGesamt = num(r.gesamt_min)

  if (unitFromParts <= 0 && vkRaw <= 0 && rawGesamt > 0 && menge > 1) {
    const lineVk = rawGesamt / menge
    if (lineVk < rawGesamt / 2) {
      lohn_netto = rawGesamt
    }
  }

  const gesamtStueck =
    vkRaw > 0
      ? Math.round(vkRaw * 100) / 100
      : Math.round((lohn_netto + material_netto) * 100) / 100

  let gesamt_min: number
  let gesamt_max: number
  if (vkRaw > 0) {
    const line = Math.round(vkRaw * menge * 100) / 100
    gesamt_min = line
    gesamt_max = line
  } else {
    const g = gesamtZeileMinMax(r, gesamtStueck, menge, preis_typ)
    gesamt_min = g.min
    gesamt_max = g.max
  }

  const out: AngebotPosition = {
    id,
    gewerk_id,
    gewerk_name,
    leistung,
    beschreibung,
    lohn_netto,
    material_netto,
    gesamt_min,
    gesamt_max,
    menge,
    einheit,
    notiz_intern,
    notiz_extern,
    preis_typ,
  }
  if (gewerk_slug) out.gewerk_slug = gewerk_slug
  const gewerk_block_key =
    r.gewerk_block_key != null && String(r.gewerk_block_key).trim()
      ? String(r.gewerk_block_key).trim()
      : undefined
  if (gewerk_block_key) out.gewerk_block_key = gewerk_block_key
  if (leistung_id) out.leistung_id = leistung_id
  if (leistung_name) out.leistung_name = leistung_name
  const mwstRaw = num(r.mwst_satz)
  if (mwstRaw === 0 || mwstRaw === 7 || mwstRaw === 19) out.mwst_satz = mwstRaw
  const kostenverteilung = parseKostenverteilung(r.kostenverteilung)
  if (kostenverteilung) out.kostenverteilung = kostenverteilung
  if (vkRaw > 0) out.vk_netto = vkRaw
  if (r.kostenart === 'anfahrt' || gewerk_slug === GEWERK_SLUG_ANFAHRT) out.kostenart = 'anfahrt'
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
  positionen: AngebotPosition[],
  aufgabeNotizenByGewerk?: Record<string, string | null | undefined>
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
      aufgabe_notiz: aufgabeNotizenByGewerk?.[gid]?.trim() || null,
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

/** Nur Positionen mit expliziter Kostenart Lohn/Material (nicht „Allgemein“). */
export function summenKostenaufstellungAusPositionen(
  positionen: AngebotPosition[]
): { lohn_netto: number; material_netto: number } | null {
  let lohn = 0
  let material = 0
  for (const p of normalizeAngebotPositionen(positionen)) {
    if (!istPreisPosition(p)) continue
    const kv = p.kostenverteilung ?? 'allgemein'
    if (kv === 'allgemein') continue
    const m = p.menge || 1
    if (kv === 'lohn') {
      lohn += (Number(p.lohn_netto) || 0) * m
    } else if (kv === 'material') {
      material += (Number(p.material_netto) || 0) * m
    }
  }
  lohn = Math.round(lohn * 100) / 100
  material = Math.round(material * 100) / 100
  if (lohn <= 0 && material <= 0) return null
  return { lohn_netto: lohn, material_netto: material }
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
    if (!istPreisPosition(p)) continue
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

/**
 * Einzelpreis netto (z. B. €/m²) — bevorzugt vk_netto.
 * Legacy: gesamt_min enthielt oft den Stück-/m²-Preis statt der Zeilensumme → nicht blind /menge teilen.
 */
function vkAusGesamtMin(raw: number, menge: number): number {
  const m = Math.max(menge, 0.0001)
  if (raw <= 0) return 0
  if (m <= 1) return Math.round(raw * 100) / 100
  const lineVk = Math.round((raw / m) * 100) / 100
  if (lineVk < raw / 2) return Math.round(raw * 100) / 100
  return lineVk
}

export function positionVkNettoStueck(p: AngebotPosition): number {
  const vk = num(p.vk_netto)
  if (vk > 0) return Math.round(vk * 100) / 100

  const m = Math.max(p.menge || 1, 0.0001)
  const raw = Math.abs(num(p.gesamt_min))
  const fromGesamt = vkAusGesamtMin(raw, m)
  const fromParts = Math.round((Number(p.lohn_netto || 0) + Number(p.material_netto || 0)) * 100) / 100

  if (fromParts > 0 && raw > 0) {
    const lineFromParts = Math.round(fromParts * m * 100) / 100
    if (Math.abs(lineFromParts - raw) > 0.05) return fromGesamt > 0 ? fromGesamt : fromParts
  }
  if (fromParts > 0) return fromParts
  return fromGesamt
}

/** Korrigiert vk_netto, Zeilensumme und ggf. Lohn/Material nach dem Laden oder vor dem Speichern. */
export function repairAngebotPositionPreise(p: AngebotPosition): AngebotPosition {
  const slug = p.gewerk_slug ?? ''
  if (slug === '__freitext__' || slug === '__gesamtrabatt__') return p

  const m = Math.max(p.menge || 1, 0.0001)
  const vk = positionVkNettoStueck(p)
  if (vk <= 0) return p

  const line = Math.round(vk * m * 100) / 100
  let lohn = Number(p.lohn_netto) || 0
  let mat = Number(p.material_netto) || 0
  const unitSum = Math.round((lohn + mat) * 100) / 100

  if (unitSum <= 0.01) {
    lohn = vk
    mat = 0
  } else if (Math.abs(unitSum - vk) > 0.05) {
    const f = vk / unitSum
    lohn = Math.round(lohn * f * 100) / 100
    mat = Math.round((vk - lohn) * 100) / 100
  }

  return {
    ...p,
    vk_netto: vk,
    lohn_netto: lohn,
    material_netto: mat,
    gesamt_min: line,
    gesamt_max: line,
  }
}

export function repairAngebotPositionen(positionen: AngebotPosition[]): AngebotPosition[] {
  return positionen.map(repairAngebotPositionPreise)
}
