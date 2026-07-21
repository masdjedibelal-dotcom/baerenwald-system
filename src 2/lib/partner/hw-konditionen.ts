import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotHandwerkerRow, AngebotPosition } from '@/lib/types'
import { hasHwEinreichung } from '@/lib/partner/handwerker-einreichung'

export const HW_KONDITION_MWST_DEFAULT = 19

export type HwKonditionenArt = 'bestaetigt' | 'gegenvorschlag'

export type HwKonditionenPosition = {
  position_id: string
  leistung: string
  beschreibung?: string
  ek_netto: number | null
  hw_netto: number
  mwst_satz: number
  geaendert: boolean
}

export type HwKonditionenJson = {
  art: HwKonditionenArt
  positionen: HwKonditionenPosition[]
  eingereicht_at?: string
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveMwstSatz(raw: Record<string, unknown>): number {
  const mwst = num(raw.mwst_satz)
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst
  return HW_KONDITION_MWST_DEFAULT
}

export function parseHwKonditionen(raw: unknown): HwKonditionenJson | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const art: HwKonditionenArt = o.art === 'gegenvorschlag' ? 'gegenvorschlag' : 'bestaetigt'
  const posRaw = o.positionen
  if (!Array.isArray(posRaw)) return null

  const positionen: HwKonditionenPosition[] = []
  for (const item of posRaw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    const hw = num(p.hw_netto)
    if (hw < 0) continue
    positionen.push({
      position_id: String(p.position_id ?? '').trim(),
      leistung: String(p.leistung ?? 'Leistung').trim() || 'Leistung',
      beschreibung:
        typeof p.beschreibung === 'string' ? p.beschreibung.trim() || undefined : undefined,
      ek_netto:
        p.ek_netto == null ? null : num(p.ek_netto) > 0 ? round2(num(p.ek_netto)) : null,
      hw_netto: round2(hw),
      mwst_satz: resolveMwstSatz(p),
      geaendert: Boolean(p.geaendert),
    })
  }

  if (!positionen.length) return null
  return {
    art,
    positionen,
    eingereicht_at: typeof o.eingereicht_at === 'string' ? o.eingereicht_at : undefined,
  }
}

export function hwKonditionenArtLabel(art: HwKonditionenArt): string {
  return art === 'gegenvorschlag' ? 'Gegenvorschlag' : 'Bestätigt'
}

export function hwKonditionenArtBadgeClass(art: HwKonditionenArt): string {
  return art === 'gegenvorschlag'
    ? 'bg-amber-100 text-amber-950'
    : 'bg-emerald-100 text-emerald-900'
}

export function hwKonditionDelta(ek: number | null, hw: number): number | null {
  if (ek == null || ek <= 0) return null
  return round2(hw - ek)
}

export function summeHwKonditionNetto(
  positionen: HwKonditionenPosition[],
  field: 'hw_netto' | 'ek_netto' = 'hw_netto'
): number {
  let sum = 0
  for (const p of positionen) {
    const n = field === 'hw_netto' ? p.hw_netto : p.ek_netto
    if (n != null && n > 0) sum += n
  }
  return round2(sum)
}

export function summeHwKonditionBrutto(positionen: HwKonditionenPosition[]): number {
  let sum = 0
  for (const p of positionen) {
    if (p.hw_netto <= 0) continue
    sum += round2(p.hw_netto * (1 + p.mwst_satz / 100))
  }
  return round2(sum)
}

function normLeistung(s: string): string {
  return s.trim().toLowerCase()
}

type AuftragPosMatch = {
  id: string
  leistung_name: string
  gewerk_slug: string | null
  gewerk_name: string
}

/** Auftragsposition zu CRM-Angebotsposition (position_id) oder Leistungstext. */
export function resolveAuftragPositionId(
  angebotPositionen: AngebotPosition[],
  auftragPositionen: AuftragPosMatch[],
  kondition: HwKonditionenPosition,
  gewerkSlug?: string | null,
  gewerkName?: string | null
): string | null {
  const angPos = angebotPositionen.find((p) => p.id === kondition.position_id)
  const leistung = normLeistung(
    angPos
      ? String(angPos.leistung_name || angPos.leistung || kondition.leistung)
      : kondition.leistung
  )
  const slug = (angPos?.gewerk_slug || gewerkSlug || '').trim() || null
  const gName = (angPos?.gewerk_name || gewerkName || '').trim() || null

  const scoped = auftragPositionen.filter((ap) => {
    if (slug && ap.gewerk_slug?.trim() === slug) return true
    if (gName && normLeistung(ap.gewerk_name) === normLeistung(gName)) return true
    if (!slug && !gName) return true
    return false
  })

  const pool = scoped.length ? scoped : auftragPositionen
  const exact = pool.find((ap) => normLeistung(ap.leistung_name) === leistung)
  if (exact) return exact.id

  if (pool.length === 1) return pool[0]!.id
  return null
}

/** Konditionszeile zu einer Auftragsposition (Angebot-ID oder Leistungstext). */
export function hwKonditionForAuftragPosition(
  konditionen: HwKonditionenJson | null,
  auftragPos: AuftragPosMatch,
  angebotPositionen: AngebotPosition[],
  gewerkSlug?: string | null,
  gewerkName?: string | null
): HwKonditionenPosition | null {
  if (!konditionen?.positionen.length) return null

  for (const k of konditionen.positionen) {
    const resolved = resolveAuftragPositionId(
      angebotPositionen,
      [auftragPos],
      k,
      gewerkSlug,
      gewerkName
    )
    if (resolved === auftragPos.id) return k
  }

  const byName = normLeistung(auftragPos.leistung_name)
  const exact = konditionen.positionen.find((k) => normLeistung(k.leistung) === byName)
  if (exact) return exact

  if (konditionen.positionen.length === 1) return konditionen.positionen[0]!
  return null
}

/** Partnerpreis pro Angebotsposition (aus übernommenen / eingereichten Konditionen). */
export function buildPartnerPreisByAngebotPositionId(
  rows: AngebotHandwerkerRow[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!hasHwEinreichung(r)) continue
    const k = parseHwKonditionen(r.hw_konditionen)
    if (!k) continue
    for (const p of k.positionen) {
      if (p.position_id && p.hw_netto > 0) map.set(p.position_id, p.hw_netto)
    }
  }
  return map
}

export function partnerPreisMapFromZuweisung(
  row: Pick<AngebotHandwerkerRow, 'hw_konditionen'>
): Map<string, number> {
  const k = parseHwKonditionen(row.hw_konditionen)
  const map = new Map<string, number>()
  if (!k) return map
  for (const p of k.positionen) {
    if (p.position_id && p.hw_netto > 0) map.set(p.position_id, p.hw_netto)
  }
  return map
}

export function angebotPositionenFromRaw(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

/** Zeilen-Netto aus Einkaufspreis/Einheit × Menge. */
export function zeileNettoAusEinkaufspreis(p: Pick<AngebotPosition, 'einkaufspreis' | 'menge'>): number | null {
  if (p.einkaufspreis == null || p.einkaufspreis <= 0) return null
  return round2(p.einkaufspreis * (p.menge || 1))
}

/** Einkaufspreis pro Einheit aus Zeilen-Netto. */
export function einkaufspreisAusZeileNetto(zeileNetto: number, menge: number): number {
  const m = menge > 0 ? menge : 1
  return round2(zeileNetto / m)
}

export function vereinbarteZeileNettoByPositionId(
  konditionen: HwKonditionenJson | null
): Map<string, number> {
  const map = new Map<string, number>()
  if (!konditionen) return map
  for (const p of konditionen.positionen) {
    if (p.position_id && p.hw_netto > 0) map.set(p.position_id, p.hw_netto)
  }
  return map
}

/**
 * Nach CRM-Übernahme: vereinbarter HW-Preis = Einkaufspreis (je Einheit).
 * vereinbart_netto_zeile → einkaufspreis = zeile / menge
 */
export function applyVereinbarteKonditionenToAngebotPositionen(
  positionen: AngebotPosition[],
  konditionen: HwKonditionenJson
): { positionen: AngebotPosition[]; aktualisiert: number } {
  const byId = vereinbarteZeileNettoByPositionId(konditionen)
  let aktualisiert = 0
  const next = positionen.map((pos) => {
    if (!pos.id || !byId.has(pos.id)) return pos
    const zeileNetto = byId.get(pos.id)!
    const ekUnit = einkaufspreisAusZeileNetto(zeileNetto, pos.menge || 1)
    aktualisiert++
    return { ...pos, einkaufspreis: ekUnit }
  })
  return { positionen: next, aktualisiert }
}

/** Legacy ohne hw_konditionen: Gesamt-Netto auf alle Positionen des Gewerks. */
export function applyLegacyGewerkZeileToAngebotPositionen(
  positionen: AngebotPosition[],
  gewerkId: string,
  zeileNetto: number
): { positionen: AngebotPosition[]; aktualisiert: number } {
  if (zeileNetto <= 0) return { positionen, aktualisiert: 0 }
  let aktualisiert = 0
  const next = positionen.map((pos) => {
    if (pos.gewerk_id !== gewerkId) return pos
    aktualisiert++
    return {
      ...pos,
      einkaufspreis: einkaufspreisAusZeileNetto(zeileNetto, pos.menge || 1),
    }
  })
  return { positionen: next, aktualisiert }
}
