import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

export type DashboardZeitraumPreset =
  | 'heute'
  | 'diese_woche'
  | 'dieser_monat'
  | 'dieses_jahr'
  | 'gesamt'
  | 'benutzerdefiniert'

/** @deprecated Alias — nutze DashboardZeitraumPreset */
export type DashboardZeitraum = DashboardZeitraumPreset

export type DashboardZeitraumFilter = {
  preset: DashboardZeitraumPreset
  von: string
  bis: string
}

export const DASHBOARD_ZEITRAUM_OPTIONS: { value: DashboardZeitraumPreset; label: string }[] = [
  { value: 'heute', label: 'Heute' },
  { value: 'diese_woche', label: 'Diese Woche' },
  { value: 'dieser_monat', label: 'Dieser Monat' },
  { value: 'dieses_jahr', label: 'Dieses Jahr' },
  { value: 'gesamt', label: 'Gesamt' },
  { value: 'benutzerdefiniert', label: 'Individuell' },
]

const LEGACY_ZEITRAUM: Record<string, DashboardZeitraumPreset> = {
  all: 'gesamt',
  year: 'dieses_jahr',
  '30d': 'dieser_monat',
  '90d': 'dieses_jahr',
}

export function parseDashboardZeitraum(
  raw: string | null | undefined,
  von?: string | null,
  bis?: string | null
): DashboardZeitraumFilter {
  const presetRaw = raw?.trim() ?? ''
  const preset = (
    DASHBOARD_ZEITRAUM_OPTIONS.some((o) => o.value === presetRaw)
      ? presetRaw
      : LEGACY_ZEITRAUM[presetRaw] ?? 'gesamt'
  ) as DashboardZeitraumPreset

  return {
    preset,
    von: von?.trim() ?? '',
    bis: bis?.trim() ?? '',
  }
}

/** Liefert [from, to] in lokaler Zeit oder null bei „Gesamt“ / ungültigem Individuell. */
export function getDashboardZeitraumRange(
  filter: DashboardZeitraumFilter,
  now = new Date()
): { from: Date; to: Date } | null {
  const { preset, von, bis } = filter
  if (preset === 'gesamt') return null
  if (preset === 'heute') {
    return { from: startOfDay(now), to: endOfDay(now) }
  }
  if (preset === 'diese_woche') {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    }
  }
  if (preset === 'dieser_monat') {
    return { from: startOfMonth(now), to: endOfMonth(now) }
  }
  if (preset === 'dieses_jahr') {
    return { from: startOfYear(now), to: endOfYear(now) }
  }
  if (preset === 'benutzerdefiniert') {
    if (!von.trim() || !bis.trim()) return null
    const from = startOfDay(parseISO(von))
    const to = endOfDay(parseISO(bis))
    if (from.getTime() > to.getTime()) return null
    return { from, to }
  }
  return null
}

/** @deprecated Nutze getDashboardZeitraumRange */
export function zeitraumStartIso(
  z: DashboardZeitraumPreset | DashboardZeitraumFilter,
  now = new Date()
): string | null {
  const filter =
    typeof z === 'string' ? parseDashboardZeitraum(z) : z
  const range = getDashboardZeitraumRange(filter, now)
  return range?.from.toISOString() ?? null
}

export function inZeitraum(
  iso: string | null | undefined,
  rangeOrStartIso: { from: Date; to: Date } | string | null
): boolean {
  if (!rangeOrStartIso) return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (typeof rangeOrStartIso === 'string') {
    return t >= new Date(rangeOrStartIso).getTime()
  }
  return t >= rangeOrStartIso.from.getTime() && t <= rangeOrStartIso.to.getTime()
}

export function dashboardZeitraumLabel(filter: DashboardZeitraumFilter): string {
  if (filter.preset === 'benutzerdefiniert' && filter.von && filter.bis) {
    const fmt = (d: string) =>
      parseISO(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${fmt(filter.von)} – ${fmt(filter.bis)}`
  }
  return DASHBOARD_ZEITRAUM_OPTIONS.find((o) => o.value === filter.preset)?.label ?? 'Gesamt'
}

export function buildDashboardZeitraumHref(filter: DashboardZeitraumFilter): string {
  if (filter.preset === 'gesamt') return '/'
  const params = new URLSearchParams()
  params.set('zeitraum', filter.preset)
  if (filter.preset === 'benutzerdefiniert') {
    if (filter.von) params.set('von', filter.von)
    if (filter.bis) params.set('bis', filter.bis)
  }
  return `/?${params.toString()}`
}

export function angebotNetto(
  ang: {
    gesamt_fix?: number | null
    gesamt_min?: number | null
    gesamt_max?: number | null
    positionen?: unknown
  } | null | undefined
): number {
  if (!ang) return 0
  const fix = Number(ang.gesamt_fix)
  if (Number.isFinite(fix) && fix > 0) return fix
  const min = Number(ang.gesamt_min) || 0
  const max = Number(ang.gesamt_max) || 0
  if (min > 0 || max > 0) return min === max ? min : (min + max) / 2
  const pos = normalizeAngebotPositionen(ang.positionen)
  if (!pos.length) return 0
  return auftragSummenAusPositionen(pos).netto
}

export function auftragNetto(auftrag: {
  angebote?:
    | {
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
        positionen?: unknown
      }
    | {
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
        positionen?: unknown
      }[]
    | null
  auftrag_positionen?: AuftragPosition[] | AngebotPosition[] | null
}): number {
  const ang = Array.isArray(auftrag.angebote) ? auftrag.angebote[0] : auftrag.angebote
  const fromAng = angebotNetto(ang)
  if (fromAng > 0) return fromAng
  const pos = auftrag.auftrag_positionen
  if (!pos?.length) return 0
  const first = pos[0] as AuftragPosition & AngebotPosition
  if ('preis_fix' in first || 'lohn_fix' in first || 'leistung_name' in first) {
    return auftragSummenAusPositionen(
      auftragPositionenToAngebotPositionen(pos as AuftragPosition[])
    ).netto
  }
  return auftragSummenAusPositionen(pos as AngebotPosition[]).netto
}

export type UmsatzMonat = {
  key: string
  label: string
  /** Aktive Aufträge (offen / in Arbeit / Abnahme) */
  offen: number
  abgeschlossen: number
  rechnungen: number
}

export function umsatzMonatGesamt(m: Pick<UmsatzMonat, 'offen' | 'abgeschlossen' | 'rechnungen'>): number {
  return (Number(m.offen) || 0) + (Number(m.abgeschlossen) || 0) + (Number(m.rechnungen) || 0)
}

/** Letzte `monateCount` Kalendermonate inkl. aktueller Monat (default 6). */
export function buildUmsatzverlauf(
  auftraege: Array<{
    status: string
    created_at: string
    angebote?: unknown
    auftrag_positionen?: AngebotPosition[] | null
  }>,
  rechnungen: Array<{
    status?: string | null
    created_at: string
    netto?: number | null
    auftrag_id?: string | null
  }> = [],
  monateCount = 6,
  now = new Date()
): UmsatzMonat[] {
  const n = Math.max(1, Math.floor(monateCount))
  const months: UmsatzMonat[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'short' }).replace(/\.$/, '')
    months.push({ key, label, offen: 0, abgeschlossen: 0, rechnungen: 0 })
  }
  const byKey = new Map(months.map((m) => [m.key, m]))

  for (const a of auftraege) {
    if (a.status === 'storniert') continue
    const created = new Date(a.created_at)
    if (Number.isNaN(created.getTime())) continue
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    const bucket = byKey.get(key)
    if (!bucket) continue
    const netto = auftragNetto(a as Parameters<typeof auftragNetto>[0])
    if (a.status === 'abgeschlossen') bucket.abgeschlossen += netto
    else if (a.status === 'offen' || a.status === 'in_arbeit' || a.status === 'abnahme') {
      bucket.offen += netto
    }
  }

  for (const r of rechnungen) {
    if (String(r.status ?? '').toLowerCase() === 'storniert') continue
    if ((r.auftrag_id ?? '').trim()) continue
    const created = new Date(r.created_at)
    if (Number.isNaN(created.getTime())) continue
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    const bucket = byKey.get(key)
    if (!bucket) continue
    bucket.rechnungen += Number(r.netto) || 0
  }

  return months
}

/** @deprecated Nutze buildUmsatzverlauf(..., [], 12) */
export function buildUmsatzverlauf12m(
  auftraege: Parameters<typeof buildUmsatzverlauf>[0],
  now = new Date()
): UmsatzMonat[] {
  return buildUmsatzverlauf(auftraege, [], 12, now)
}

export type GewerkUmsatzZeile = {
  name: string
  netto: number
  anteil: number
}

/** Katalog-Gewerk (wie Angebot/Rechnung-Select) — für Dashboard-Aggregation. */
export type DashboardGewerkKatalog = {
  id: string
  name: string
  slug: string
}

const GEWERK_COLORS = [
  '#2E7D52',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#6B8F71',
  '#C45C26',
  '#0D9488',
  '#64748B',
]

export function gewerkColor(index: number): string {
  return GEWERK_COLORS[index % GEWERK_COLORS.length]!
}

/** Interne Positions-Slugs — kein Katalog-Gewerk (Anfahrt, Nachlass, Freitext-Marker). */
const DASHBOARD_GEWERK_SKIP_SLUGS = new Set([
  '__anfahrt__',
  '__gesamtrabatt__',
  '__freitext__',
  'abschlag_abzug',
])

type GewerkLookup = {
  byId: Map<string, string>
  bySlug: Map<string, string>
  byName: Map<string, string>
}

function buildGewerkLookup(katalog: DashboardGewerkKatalog[]): GewerkLookup {
  const byId = new Map<string, string>()
  const bySlug = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const g of katalog) {
    const name = g.name.trim()
    if (!name) continue
    const id = g.id.trim()
    if (id) byId.set(id, name)
    const slug = g.slug.trim().toLowerCase()
    if (slug) bySlug.set(slug, name)
    byName.set(name.toLowerCase(), name)
  }
  return { byId, bySlug, byName }
}

/**
 * Kanonisches Gewerk-Label wie im Angebot/Rechnung-Select.
 * Nicht: Block-Titel / Freitext-Überschrift in `gewerk_name` (z. B. „Bad + WC“, „b4“).
 */
function resolveDashboardGewerkLabel(
  p: AngebotPosition,
  lookup: GewerkLookup
): string | null {
  const leistung = (p.leistung ?? '').trim().toLowerCase()
  if (leistung === '__gewerk_beschreibung__') return null

  const slug = (p.gewerk_slug ?? '').trim().toLowerCase()
  if (slug && DASHBOARD_GEWERK_SKIP_SLUGS.has(slug)) return null

  const id = (p.gewerk_id ?? '').trim()
  if (id) {
    const fromId = lookup.byId.get(id)
    if (fromId) return fromId
  }

  if (slug) {
    const fromSlug = lookup.bySlug.get(slug)
    if (fromSlug) return fromSlug
  }

  const rawName = (p.gewerk_name ?? '').trim()
  if (rawName) {
    const fromName = lookup.byName.get(rawName.toLowerCase())
    if (fromName) return fromName
    const fromNameAsSlug = lookup.bySlug.get(rawName.toLowerCase())
    if (fromNameAsSlug) return fromNameAsSlug
  }

  // Kein Katalog-Treffer — nicht den Block-Titel als Gewerk ausgeben
  return 'Sonstiges'
}

function addGewerkPositionen(
  map: Map<string, number>,
  positionen: unknown,
  lookup: GewerkLookup
) {
  const pos = normalizeAngebotPositionen(positionen)
  for (const p of pos) {
    const name = resolveDashboardGewerkLabel(p, lookup)
    if (!name) continue
    const line = Number(p.gesamt_min) || Number(p.vk_netto) || 0
    if (line <= 0) continue
    map.set(name, (map.get(name) ?? 0) + line)
  }
}

/**
 * Umsatz nach Gewerk (Katalog aus Angebot/Rechnung-Select):
 * - abgeschlossene Aufträge/Leads über Angebotspositionen
 * - plus Rechnungspositionen nur ohne Auftrag (Direktrechnungen)
 * Aggregiert nach gewerk_id/slug → `gewerke.name`, nicht nach Block-Titel.
 */
export function buildGewerkUmsatz(
  angebote: Array<{
    positionen?: unknown
    leads?: { status?: string | null } | { status?: string | null }[] | null
    auftraege?: { status?: string | null } | { status?: string | null }[] | null
  }>,
  rechnungen: Array<{
    positionen?: unknown
    status?: string | null
    auftrag_id?: string | null
  }> = [],
  gewerkeKatalog: DashboardGewerkKatalog[] = []
): { zeilen: GewerkUmsatzZeile[]; gesamt: number } {
  const lookup = buildGewerkLookup(gewerkeKatalog)
  const map = new Map<string, number>()

  for (const ang of angebote) {
    const lead = Array.isArray(ang.leads) ? ang.leads[0] : ang.leads
    const auftrag = Array.isArray(ang.auftraege) ? ang.auftraege[0] : ang.auftraege
    const leadDone = String(lead?.status ?? '').toLowerCase() === 'abgeschlossen'
    const auftragDone = String(auftrag?.status ?? '').toLowerCase() === 'abgeschlossen'
    if (!leadDone && !auftragDone) continue
    addGewerkPositionen(map, ang.positionen, lookup)
  }

  for (const r of rechnungen) {
    if (String(r.status ?? '').toLowerCase() === 'storniert') continue
    if ((r.auftrag_id ?? '').trim()) continue
    addGewerkPositionen(map, r.positionen, lookup)
  }

  const gesamt = Array.from(map.values()).reduce((a, b) => a + b, 0)
  const zeilen = Array.from(map.entries())
    .map(([name, netto]) => ({
      name,
      netto,
      anteil: gesamt > 0 ? Math.round((netto / gesamt) * 100) : 0,
    }))
    .sort((a, b) => b.netto - a.netto)

  return { zeilen, gesamt }
}

export type RankingZeile = {
  id: string
  name: string
  sub: string
  vorgaenge: number
  umsatz: number
  /** Handwerker: Summe Einkaufspreis Zuweisung */
  ek?: number
}

export function buildHandwerkerRanking(
  rows: Array<{
    handwerker_id: string
    handwerker_name: string
    gewerk: string
    vereinbarter_preis: number
    auftrag_id: string
    auftrag_netto: number
    lead_id: string | null
    angebot_id: string | null
  }>
): RankingZeile[] {
  type Acc = {
    name: string
    gewerke: Set<string>
    leads: Set<string>
    angebote: Set<string>
    auftraege: Set<string>
    ek: number
    umsatz: number
  }
  const map = new Map<string, Acc>()

  for (const r of rows) {
    let acc = map.get(r.handwerker_id)
    if (!acc) {
      acc = {
        name: r.handwerker_name,
        gewerke: new Set(),
        leads: new Set(),
        angebote: new Set(),
        auftraege: new Set(),
        ek: 0,
        umsatz: 0,
      }
      map.set(r.handwerker_id, acc)
    }
    if (r.gewerk) acc.gewerke.add(r.gewerk)
    if (r.lead_id) acc.leads.add(r.lead_id)
    if (r.angebot_id) acc.angebote.add(r.angebot_id)
    if (r.auftrag_id) {
      if (!acc.auftraege.has(r.auftrag_id)) {
        acc.auftraege.add(r.auftrag_id)
        acc.umsatz += r.auftrag_netto
      }
    }
    if (r.vereinbarter_preis > 0) acc.ek += r.vereinbarter_preis
  }

  return Array.from(map.entries())
    .map(([id, a]) => ({
      id,
      name: a.name,
      sub: '',
      vorgaenge: a.auftraege.size,
      umsatz: a.umsatz,
      ek: a.ek,
    }))
    .sort((a, b) => (b.ek ?? 0) - (a.ek ?? 0) || b.umsatz - a.umsatz)
    .slice(0, 8)
}

/** Top-Kunden: Auftragssumme pro Auftrag; nur Rechnungen ohne Auftrag extra (keine Doppelzählung). */
export function buildKundenRanking(
  rows: Array<{
    kunde_id: string
    kunde_name: string
    auftrag_id?: string | null
    auftrag_netto?: number
    rechnung_id?: string | null
    rechnung_netto?: number
    /** Rechnung gehört zu diesem Auftrag → nicht zum Umsatz zählen. */
    rechnung_auftrag_id?: string | null
  }>
): RankingZeile[] {
  type Acc = {
    name: string
    auftraege: Set<string>
    freieRechnungen: Set<string>
    umsatz: number
  }
  const map = new Map<string, Acc>()

  for (const r of rows) {
    let acc = map.get(r.kunde_id)
    if (!acc) {
      acc = {
        name: r.kunde_name,
        auftraege: new Set(),
        freieRechnungen: new Set(),
        umsatz: 0,
      }
      map.set(r.kunde_id, acc)
    }
    if (r.kunde_name && r.kunde_name !== 'Kunde') acc.name = r.kunde_name
    const auftragId = (r.auftrag_id ?? '').trim()
    if (auftragId && !acc.auftraege.has(auftragId)) {
      acc.auftraege.add(auftragId)
      acc.umsatz += Number(r.auftrag_netto) || 0
    }
    const rechnungId = (r.rechnung_id ?? '').trim()
    const linkedAuftrag = (r.rechnung_auftrag_id ?? '').trim()
    if (rechnungId && !linkedAuftrag && !acc.freieRechnungen.has(rechnungId)) {
      acc.freieRechnungen.add(rechnungId)
      acc.umsatz += Number(r.rechnung_netto) || 0
    }
  }

  return Array.from(map.entries())
    .map(([id, a]) => ({
      id,
      name: a.name,
      sub: '',
      vorgaenge: a.auftraege.size + a.freieRechnungen.size,
      umsatz: a.umsatz,
    }))
    .filter((r) => r.vorgaenge > 0)
    .sort((a, b) => b.umsatz - a.umsatz || b.vorgaenge - a.vorgaenge)
    .slice(0, 8)
}

export type FunnelStufe = {
  key: string
  label: string
  count: number
  rate: number
  color: string
}

export function buildVertriebsFunnel(input: {
  anfragen: number
  /** Erstellte Angebote (Lead-eindeutig empfohlen). */
  angebote: number
  /** Aufträge gesamt (aktiv + erledigt, Lead-eindeutig empfohlen). */
  auftraege: number
}): { stufen: FunnelStufe[]; conversionGesamt: number } {
  // Monoton: Anfragen ≥ Angebote ≥ Aufträge
  const a = Math.max(0, input.anfragen)
  const b = Math.min(Math.max(0, input.angebote), a)
  const c = Math.min(Math.max(0, input.auftraege), b)

  const rateOf = (n: number) => (a > 0 ? Math.round((n / a) * 100) : 0)

  const stufen: FunnelStufe[] = [
    { key: 'anfrage', label: 'Anfragen', count: a, rate: 100, color: '#3B82F6' },
    {
      key: 'angebot',
      label: 'Angebote erstellt',
      count: b,
      rate: rateOf(b),
      color: '#F59E0B',
    },
    {
      key: 'auftrag',
      label: 'Aufträge',
      count: c,
      rate: rateOf(c),
      color: '#2E7D52',
    },
  ]

  const conversionGesamt = a > 0 ? Math.round((c / a) * 100) : 0
  return { stufen, conversionGesamt }
}

/** Zählt eindeutige Vorgänge (Lead-ID), Fallback ohne Lead = eigene ID. */
export function countUniqueVorgaengeByLead(
  rows: Array<{ id?: string | null; lead_id?: string | null }>
): number {
  const keys = new Set<string>()
  for (const row of rows) {
    const leadId = String(row.lead_id ?? '').trim()
    if (leadId) {
      keys.add(`lead:${leadId}`)
      continue
    }
    const id = String(row.id ?? '').trim()
    if (id) keys.add(`id:${id}`)
  }
  return keys.size
}
