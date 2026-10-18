import { formatMonatKurzJahr } from '@/lib/utils'
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
import type { AngebotPosition,AuftragPosition } from '@/lib/types'
import { C } from '@/lib/tokens/colors'

export type DashboardZeitraumPreset =
  | 'heute'
  | 'diese_woche'
  | 'dieser_monat'
  | 'dieses_jahr'
  | 'gesamt'
  | 'benutzerdefiniert'

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
  /** Direktrechnungen ohne Auftrag */
  rechnungen: number
}

export function umsatzMonatGesamt(m: Pick<UmsatzMonat, 'offen' | 'abgeschlossen' | 'rechnungen'>): number {
  return (Number(m.offen) || 0) + (Number(m.abgeschlossen) || 0) + (Number(m.rechnungen) || 0)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return formatMonatKurzJahr(d, { withYear: false })
}

function buildMonthBuckets(
  range: { from: Date; to: Date } | null | undefined,
  monateCount: number,
  now: Date
): UmsatzMonat[] {
  const months: UmsatzMonat[] = []
  if (range) {
    let cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1)
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1)
    while (cursor.getTime() <= end.getTime() && months.length < 24) {
      months.push({
        key: monthKey(cursor),
        label: monthLabel(cursor),
        offen: 0,
        abgeschlossen: 0,
        rechnungen: 0,
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return months
  }
  const n = Math.max(1, Math.floor(monateCount))
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: monthKey(d),
      label: monthLabel(d),
      offen: 0,
      abgeschlossen: 0,
      rechnungen: 0,
    })
  }
  return months
}

export type BuildUmsatzverlaufOpts = {
  monateCount?: number
  now?: Date
  /** Dashboard-Zeitraum — Monate werden aus dem Range gebaut; null = letzte N Monate. */
  range?: { from: Date; to: Date } | null
}

/**
 * Eine Wahrheit für Umsatz (30.09.2026): Netto gestellter Rechnungen (offen oder bezahlt),
 * nach Rechnungsdatum. Stornierte Rechnungen und Storno-Gutschriften heben sich auf und
 * fallen beide heraus; Entwürfe zählen nicht.
 * Echte Gutschriften (Bezugsrechnung nicht storniert, z. B. Preisnachlass) mindern den Umsatz
 * mit ihrem negativen Netto.
 */
export function istUmsatzRechnung(
  r: {
    status?: string | null
    beleg_typ?: string | null
    bezug_rechnung_id?: string | null
  },
  stornierteIds?: ReadonlySet<string>
): boolean {
  const st = String(r.status ?? '').toLowerCase()
  if (st !== 'gesendet' && st !== 'bezahlt') return false
  const typ = String(r.beleg_typ ?? 'rechnung').toLowerCase()
  if (typ === 'rechnung') return true
  if (typ !== 'gutschrift') return false
  const bezug = r.bezug_rechnung_id?.trim()
  return !(bezug && stornierteIds?.has(bezug))
}

/** Ids stornierter Rechnungen — Gutschriften dazu sind Storno-Belege (zählen nicht). */
export function stornierteRechnungIds(
  rechnungen: Array<{ id: string; status?: string | null }>
): Set<string> {
  return new Set(rechnungen.filter((r) => String(r.status ?? '').toLowerCase() === 'storniert').map((r) => r.id))
}

/** Gestellter Beleg (Rechnung oder Gutschrift) für die Umsatz-Ermittlung. */
export type UmsatzBeleg = {
  id: string
  status?: string | null
  beleg_typ?: string | null
  bezug_rechnung_id?: string | null
  /** voll | abschlag | schluss */
  rechnung_art?: string | null
  auftrag_id?: string | null
  /** Rechnungsdatum (sonst created_at) */
  datum: string
  netto?: number | null
  kunde_id?: string | null
  kunde_name?: string | null
  kunde_typ?: string | null
  positionen?: unknown
}

export type UmsatzAuftrag = {
  id: string
  status?: string | null
  /** Beauftragungsdatum */
  datum: string
  /** Auftragswert netto (Positionen bzw. Angebot) */
  netto: number
  kunde_id?: string | null
  kunde_name?: string | null
  kunde_typ?: string | null
  positionen?: unknown
}

/** Eine Zeile Umsatz: ein Auftrag oder eine direkt gestellte Rechnung (ohne Auftrag). */
export type UmsatzPosten = {
  id: string
  art: 'auftrag' | 'rechnung'
  /** Auftrag: Schluss-/Vollrechnung gestellt → Betrag = Rechnungssumme */
  abgerechnet: boolean
  datum: string
  netto: number
  kunde_id: string | null
  kunde_name: string | null
  kunde_typ: string | null
  /** Für „Umsatz nach Gewerk“: Positionen mit dem Betrag, auf den sie skaliert werden */
  gewerkQuellen: Array<{ positionen: unknown; netto: number; gutschrift?: boolean }>
}

/**
 * Eine Wahrheit für Umsatz (18.10.2026): je Auftrag genau eine Zahl, im Monat der Beauftragung.
 * - Abgerechnet (Schluss- oder Vollrechnung gestellt) → Summe der gestellten Belege (inkl. echter Gutschriften)
 * - sonst → Auftragswert (mindestens das bereits Abgerechnete, z. B. Abschläge über einem Nachtrag)
 * Rechnungen ohne Auftrag zählen einzeln im Rechnungsmonat. Stornierte Aufträge zählen nicht
 * (ihre gestellten Belege zählen wie direkte Rechnungen, damit nichts verloren geht).
 */
export function buildUmsatzPosten(
  auftraege: UmsatzAuftrag[],
  belege: UmsatzBeleg[],
  stornierteIds?: ReadonlySet<string>
): UmsatzPosten[] {
  const gezaehlt = belege.filter((b) => istUmsatzRechnung(b, stornierteIds))
  const aktiveAuftraege = new Map(
    auftraege.filter((a) => String(a.status ?? '').toLowerCase() !== 'storniert').map((a) => [a.id, a])
  )
  const proAuftrag = new Map<string, UmsatzBeleg[]>()
  const posten: UmsatzPosten[] = []
  const istGutschrift = (b: UmsatzBeleg) => String(b.beleg_typ ?? '').toLowerCase() === 'gutschrift'

  for (const b of gezaehlt) {
    const aid = b.auftrag_id?.trim()
    if (aid && aktiveAuftraege.has(aid)) {
      const liste = proAuftrag.get(aid) ?? []
      liste.push(b)
      proAuftrag.set(aid, liste)
      continue
    }
    const netto = Number(b.netto) || 0
    posten.push({
      id: b.id,
      art: 'rechnung',
      abgerechnet: true,
      datum: b.datum,
      netto,
      kunde_id: b.kunde_id ?? null,
      kunde_name: b.kunde_name ?? null,
      kunde_typ: b.kunde_typ ?? null,
      gewerkQuellen: [{ positionen: b.positionen, netto, gutschrift: istGutschrift(b) }],
    })
  }

  for (const a of aktiveAuftraege.values()) {
    const bs = proAuftrag.get(a.id) ?? []
    const fakturiert = bs.reduce((s, b) => s + (Number(b.netto) || 0), 0)
    const abgerechnet = bs.some(
      (b) =>
        !istGutschrift(b) && ['voll', 'schluss'].includes(String(b.rechnung_art ?? 'voll').toLowerCase())
    )
    const netto = abgerechnet ? fakturiert : Math.max(Number(a.netto) || 0, fakturiert)
    if (!netto && !bs.length) continue
    const ersterBeleg = bs[0]
    posten.push({
      id: a.id,
      art: 'auftrag',
      abgerechnet,
      datum: a.datum,
      netto,
      kunde_id: a.kunde_id ?? ersterBeleg?.kunde_id ?? null,
      kunde_name: a.kunde_name ?? ersterBeleg?.kunde_name ?? null,
      kunde_typ: a.kunde_typ ?? ersterBeleg?.kunde_typ ?? null,
      gewerkQuellen: abgerechnet
        ? bs.map((b) => ({ positionen: b.positionen, netto: Number(b.netto) || 0, gutschrift: istGutschrift(b) }))
        : [{ positionen: a.positionen, netto }],
    })
  }
  return posten
}

/** Umsatzverlauf je Monat aus Umsatz-Posten (Datum = Beauftragung bzw. Rechnungsdatum). */
export function buildUmsatzverlauf(posten: UmsatzPosten[], opts: BuildUmsatzverlaufOpts = {}): UmsatzMonat[] {
  const now = opts.now ?? new Date()
  const months = buildMonthBuckets(opts.range, opts.monateCount ?? 6, now)
  const byKey = new Map(months.map((m) => [m.key, m]))
  for (const p of posten) {
    const d = new Date(p.datum)
    if (Number.isNaN(d.getTime())) continue
    const bucket = byKey.get(monthKey(d))
    if (!bucket) continue
    if (p.art === 'rechnung') bucket.rechnungen += p.netto
    else if (p.abgerechnet) bucket.abgeschlossen += p.netto
    else bucket.offen += p.netto
  }
  return months
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
  lookup: GewerkLookup,
  betrag = false
) {
  const pos = normalizeAngebotPositionen(positionen)
  for (const p of pos) {
    const name = resolveDashboardGewerkLabel(p, lookup)
    if (!name) continue
    const gesamt = Number(p.gesamt_min)
    const vk = Number(p.vk_netto) || 0
    const menge = Number(p.menge) || 1
    const roh =
      Number.isFinite(gesamt) && gesamt !== 0 ? gesamt : Math.round(vk * menge * 100) / 100
    // Gutschriften: negative Zeilen über den Betrag gewichten
    const line = betrag ? Math.abs(roh) : roh
    if (!(line > 0)) continue
    map.set(name, (map.get(name) ?? 0) + line)
  }
}

/** Gewerk-Anteile aus Positionen; Summe wird später auf auftragNetto / RE-Netto skaliert. */
function gewerkAnteileFromPositionen(
  positionen: unknown,
  lookup: GewerkLookup,
  betrag = false
): Map<string, number> {
  const map = new Map<string, number>()
  addGewerkPositionen(map, positionen, lookup, betrag)
  return map
}

function addScaledToGewerkMap(
  target: Map<string, number>,
  anteile: Map<string, number>,
  sollNetto: number
) {
  if (!sollNetto) return
  let partsSum = 0
  for (const amt of anteile.values()) {
    if (amt > 0) partsSum += amt
  }
  if (partsSum <= 0) {
    target.set('Sonstiges', (target.get('Sonstiges') ?? 0) + sollNetto)
    return
  }
  for (const [name, amt] of anteile) {
    if (!(amt > 0)) continue
    target.set(name, (target.get(name) ?? 0) + sollNetto * (amt / partsSum))
  }
}

/** Umsatz nach Gewerk aus denselben Umsatz-Posten wie der Umsatzverlauf. */
export function buildGewerkUmsatz(
  posten: UmsatzPosten[],
  gewerkeKatalog: DashboardGewerkKatalog[] = []
): { zeilen: GewerkUmsatzZeile[]; gesamt: number } {
  const lookup = buildGewerkLookup(gewerkeKatalog)
  const map = new Map<string, number>()
  for (const p of posten) {
    for (const q of p.gewerkQuellen) {
      if (!q.netto) continue
      addScaledToGewerkMap(map, gewerkAnteileFromPositionen(q.positionen, lookup, q.gutschrift), q.netto)
    }
  }
  const gesamt = Array.from(map.values()).reduce((x, y) => x + y, 0)
  const zeilen = Array.from(map.entries())
    // Rest einer Gutschrift ohne zuordenbare Positionen: nicht als Minus-Zeile zeigen
    .filter(([, netto]) => netto >= 0.005)
    .map(([name, netto]) => ({
      name,
      netto: Math.round(netto * 100) / 100,
      anteil: gesamt > 0 ? Math.round((netto / gesamt) * 100) : 0,
    }))
    .sort((x, y) => y.netto - x.netto)
  return { zeilen, gesamt: Math.round(gesamt * 100) / 100 }
}

export type RankingZeile = {
  id: string
  name: string
  sub: string
  vorgaenge: number
  umsatz: number
  /** Partner: Summe Einkaufspreis Zuweisung */
  ek?: number
  /** Kunden: kunden.typ (privat | gewerbe | hausverwaltung …) */
  typ?: string | null
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

/**
 * Kunden-Ranking = dieselbe Quelle wie der Umsatz (istUmsatzRechnung): Netto je Kunde,
 * `vorgaenge` = Anzahl Umsatz-Rechnungen. Alle Kunden (UI zeigt Top N + „Übrige“ + Gesamt).
 */
export function buildKundenRanking(
  rows: Array<{
    kunde_id: string
    kunde_name: string
    kunde_typ?: string | null
    rechnung_id: string
    rechnung_netto: number
  }>
): RankingZeile[] {
  const map = new Map<
    string,
    { name: string; typ: string | null; rechnungen: Set<string>; gesehen: Set<string>; umsatz: number }
  >()
  for (const r of rows) {
    let acc = map.get(r.kunde_id)
    if (!acc) {
      acc = { name: r.kunde_name, typ: r.kunde_typ ?? null, rechnungen: new Set(), gesehen: new Set(), umsatz: 0 }
      map.set(r.kunde_id, acc)
    }
    if (r.kunde_name && r.kunde_name !== 'Kunde') acc.name = r.kunde_name
    if (!acc.typ && r.kunde_typ) acc.typ = r.kunde_typ
    const id = (r.rechnung_id ?? '').trim()
    if (!id || acc.gesehen.has(id)) continue
    acc.gesehen.add(id)
    const netto = Number(r.rechnung_netto) || 0
    // Gutschriften mindern den Umsatz, zählen aber nicht als Rechnung
    if (netto > 0) acc.rechnungen.add(id)
    acc.umsatz += netto
  }
  return Array.from(map.entries())
    .map(([id, a]) => ({ id, name: a.name, sub: '', vorgaenge: a.rechnungen.size, umsatz: a.umsatz, typ: a.typ }))
    .filter((r) => r.vorgaenge > 0)
    .sort((a, b) => b.umsatz - a.umsatz || b.vorgaenge - a.vorgaenge)
}

export type KundenTypAnteil = { typ: string; label: string; umsatz: number; anteil: number; kunden: number }

const KUNDEN_TYP_LABEL: Record<string, string> = {
  gewerbe: 'Gewerbe',
  privat: 'Privat',
  hausverwaltung: 'Hausverwaltung',
}

/** Umsatz nach Kundentyp (Summe = Kunden-Ranking gesamt). */
export function buildKundenTypAufteilung(kunden: RankingZeile[]): KundenTypAnteil[] {
  const gesamt = kunden.reduce((s, k) => s + (Number(k.umsatz) || 0), 0)
  const map = new Map<string, { umsatz: number; kunden: number }>()
  for (const k of kunden) {
    const t = String(k.typ ?? '').trim().toLowerCase() || 'ohne'
    const acc = map.get(t) ?? { umsatz: 0, kunden: 0 }
    acc.umsatz += Number(k.umsatz) || 0
    acc.kunden += 1
    map.set(t, acc)
  }
  return Array.from(map.entries())
    .map(([typ, v]) => ({
      typ,
      label: KUNDEN_TYP_LABEL[typ] ?? 'Ohne Typ',
      umsatz: v.umsatz,
      kunden: v.kunden,
      anteil: gesamt > 0 ? Math.round((v.umsatz / gesamt) * 100) : 0,
    }))
    .sort((a, b) => b.umsatz - a.umsatz)
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
    { key: 'anfrage', label: 'Anfragen', count: a, rate: 100, color: C.blue2 },
    {
      key: 'angebot',
      label: 'Angebote erstellt',
      count: b,
      rate: rateOf(b),
      color: C.amber,
    },
    {
      key: 'auftrag',
      label: 'Aufträge',
      count: c,
      rate: rateOf(c),
      color: C.green,
    },
  ]

  const conversionGesamt = a > 0 ? Math.round((c / a) * 100) : 0
  return { stufen, conversionGesamt }
}
