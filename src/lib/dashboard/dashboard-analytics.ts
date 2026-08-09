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
  offen: number
  abgeschlossen: number
}

/** Letzte `monateCount` Kalendermonate inkl. aktueller Monat (default 6). */
export function buildUmsatzverlauf(
  auftraege: Array<{
    status: string
    created_at: string
    angebote?: unknown
    auftrag_positionen?: AngebotPosition[] | null
  }>,
  monateCount = 6,
  now = new Date()
): UmsatzMonat[] {
  const n = Math.max(1, Math.floor(monateCount))
  const months: UmsatzMonat[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'short' }).replace(/\.$/, '')
    months.push({ key, label, offen: 0, abgeschlossen: 0 })
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

  return months
}

/** @deprecated Nutze buildUmsatzverlauf(..., 12) */
export function buildUmsatzverlauf12m(
  auftraege: Parameters<typeof buildUmsatzverlauf>[0],
  now = new Date()
): UmsatzMonat[] {
  return buildUmsatzverlauf(auftraege, 12, now)
}

export type GewerkUmsatzZeile = {
  name: string
  netto: number
  anteil: number
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

/** Umsatz nach Gewerk aus Angebotspositionen — nur abgeschlossene Vorgänge. */
export function buildGewerkUmsatz(
  angebote: Array<{
    positionen?: unknown
    leads?: { status?: string | null } | { status?: string | null }[] | null
    auftraege?: { status?: string | null } | { status?: string | null }[] | null
  }>
): { zeilen: GewerkUmsatzZeile[]; gesamt: number } {
  const map = new Map<string, number>()

  for (const ang of angebote) {
    const lead = Array.isArray(ang.leads) ? ang.leads[0] : ang.leads
    const auftrag = Array.isArray(ang.auftraege) ? ang.auftraege[0] : ang.auftraege
    const leadDone = String(lead?.status ?? '').toLowerCase() === 'abgeschlossen'
    const auftragDone = String(auftrag?.status ?? '').toLowerCase() === 'abgeschlossen'
    if (!leadDone && !auftragDone) continue

    const pos = normalizeAngebotPositionen(ang.positionen)
    for (const p of pos) {
      const name = (p.gewerk_name || p.gewerk_slug || 'Sonstiges').trim() || 'Sonstiges'
      const line = Number(p.gesamt_min) || Number(p.vk_netto) || 0
      if (line <= 0) continue
      map.set(name, (map.get(name) ?? 0) + line)
    }
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
      sub: Array.from(a.gewerke).slice(0, 2).join(' · ') || '—',
      vorgaenge: a.leads.size + a.angebote.size + a.auftraege.size,
      umsatz: a.umsatz,
      ek: a.ek,
    }))
    .sort((a, b) => (b.ek ?? 0) - (a.ek ?? 0) || b.umsatz - a.umsatz)
    .slice(0, 8)
}

export function buildKundenRanking(
  rows: Array<{
    kunde_id: string
    kunde_name: string
    lead_id: string | null
    angebot_id: string | null
    auftrag_id: string | null
    auftrag_netto: number
  }>
): RankingZeile[] {
  type Acc = {
    name: string
    leads: Set<string>
    angebote: Set<string>
    auftraege: Set<string>
    umsatz: number
  }
  const map = new Map<string, Acc>()

  for (const r of rows) {
    let acc = map.get(r.kunde_id)
    if (!acc) {
      acc = {
        name: r.kunde_name,
        leads: new Set(),
        angebote: new Set(),
        auftraege: new Set(),
        umsatz: 0,
      }
      map.set(r.kunde_id, acc)
    }
    if (r.lead_id) acc.leads.add(r.lead_id)
    if (r.angebot_id) acc.angebote.add(r.angebot_id)
    if (r.auftrag_id) {
      if (!acc.auftraege.has(r.auftrag_id)) {
        acc.auftraege.add(r.auftrag_id)
        acc.umsatz += r.auftrag_netto
      }
    }
  }

  return Array.from(map.entries())
    .map(([id, a]) => ({
      id,
      name: a.name,
      sub: [
        a.leads.size ? `${a.leads.size} Anfragen` : null,
        a.angebote.size ? `${a.angebote.size} Angebote` : null,
        a.auftraege.size ? `${a.auftraege.size} Aufträge` : null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
      vorgaenge: a.leads.size + a.angebote.size + a.auftraege.size,
      umsatz: a.umsatz,
    }))
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
  /** Angenommene Angebote (Lead-eindeutig empfohlen). */
  angebote: number
  /** Aktive oder abgeschlossene Aufträge (Lead-eindeutig empfohlen). */
  auftraege: number
}): { stufen: FunnelStufe[]; conversionGesamt: number; dropoffs: { after: string; lost: number; rate: number }[] } {
  // Monoton halten: Folge-Stufen dürfen die vorherige nicht übersteigen (1:n-Schutz)
  const a = Math.max(0, input.anfragen)
  const b = Math.min(Math.max(0, input.angebote), a)
  const c = Math.min(Math.max(0, input.auftraege), b)

  const stufen: FunnelStufe[] = [
    { key: 'anfrage', label: 'Anfragen', count: a, rate: 100, color: '#3B82F6' },
    {
      key: 'angebot',
      label: 'Angebote angenommen',
      count: b,
      rate: a > 0 ? Math.round((b / a) * 100) : 0,
      color: '#F59E0B',
    },
    {
      key: 'auftrag',
      label: 'Aufträge aktiv/fertig',
      count: c,
      rate: a > 0 ? Math.round((c / a) * 100) : 0,
      color: '#2E7D52',
    },
  ]

  const dropoffs: { after: string; lost: number; rate: number }[] = []
  if (a > 0) {
    const lost1 = Math.max(0, a - b)
    dropoffs.push({ after: 'anfrage', lost: lost1, rate: Math.round((lost1 / a) * 100) })
  }
  if (b > 0) {
    const lost2 = Math.max(0, b - c)
    dropoffs.push({
      after: 'angebot',
      lost: lost2,
      rate: Math.round((lost2 / b) * 100),
    })
  }

  const conversionGesamt = a > 0 ? Math.round((c / a) * 100) : 0
  return { stufen, conversionGesamt, dropoffs }
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
