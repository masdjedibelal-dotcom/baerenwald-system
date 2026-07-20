import { auftragNetto } from '@/lib/dashboard/dashboard-analytics'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'

export type KundeWirtschaftZeitraum = '6m' | '12m' | 'year' | 'all'

export const KUNDE_WIRTSCHAFT_ZEITRAUM: { id: KundeWirtschaftZeitraum; label: string }[] = [
  { id: '6m', label: '6 M' },
  { id: '12m', label: '12 M' },
  { id: 'year', label: 'Dieses Jahr' },
  { id: 'all', label: 'Gesamt' },
]

export type KundeUmsatzMonat = {
  key: string
  label: string
  betrag: number
}

export type KundeWirtschaftSnapshot = {
  zeitraum: KundeWirtschaftZeitraum
  zeitraumLabelKurz: string
  umsatz: number
  umsatzDeltaPct: number | null
  offenerBetrag: number
  aktiveVorgaenge: number
  auftraegeGesamt: number
  anfragen: number
  angebote: number
  auftraege: number
  monate: KundeUmsatzMonat[]
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('de-DE', { month: 'short' }).replace(/\.$/, '')
}

/** Zeitraum-Grenzen [start, endExclusive). start=null → unbeschränkt. */
export function kundeWirtschaftBounds(
  z: KundeWirtschaftZeitraum,
  now = new Date()
): { start: Date | null; end: Date; months: number } {
  const end = now
  if (z === 'all') return { start: null, end, months: 12 }
  if (z === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1), end, months: now.getMonth() + 1 }
  }
  const months = z === '6m' ? 6 : 12
  return { start: startOfMonth(addMonths(now, -(months - 1))), end, months }
}

function inBounds(iso: string | null | undefined, start: Date | null, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (t > end.getTime()) return false
  if (start && t < start.getTime()) return false
  return true
}

function rechnungDatum(r: {
  bezahlt_at?: string | null
  rechnungsdatum?: string | null
}): string | null {
  return r.bezahlt_at?.trim() || r.rechnungsdatum?.trim() || null
}

function auftragWert(a: NonNullable<KundeDetailPayload['auftraege']>[number]): number {
  return auftragNetto(a)
}

/** Umsatzpunkte: bezahlte Rechnungen, sonst Auftragsvolumen nach created_at. */
function umsatzEvents(kunde: KundeDetailPayload): Array<{ at: string; betrag: number }> {
  const events: Array<{ at: string; betrag: number }> = []
  const paid = (kunde.rechnungen ?? []).filter((r) => r.status === 'bezahlt')
  if (paid.length > 0) {
    for (const r of paid) {
      const at = rechnungDatum(r)
      const betrag = Number(r.brutto) || 0
      if (at && betrag > 0) events.push({ at, betrag })
    }
    return events
  }
  for (const a of kunde.auftraege ?? []) {
    if (a.status === 'storniert') continue
    const betrag = auftragWert(a)
    if (betrag > 0 && a.created_at) events.push({ at: a.created_at, betrag })
  }
  return events
}

function sumInRange(
  events: Array<{ at: string; betrag: number }>,
  start: Date | null,
  end: Date
): number {
  return events
    .filter((e) => inBounds(e.at, start, end))
    .reduce((s, e) => s + e.betrag, 0)
}

function previousBounds(
  start: Date | null,
  end: Date,
  months: number
): { start: Date; end: Date } | null {
  if (!start) return null
  const durationMs = end.getTime() - start.getTime()
  if (durationMs <= 0 && months <= 0) return null
  const prevEnd = new Date(start.getTime())
  const prevStart =
    months > 0
      ? startOfMonth(addMonths(start, -months))
      : new Date(start.getTime() - Math.max(durationMs, 1))
  return { start: prevStart, end: prevEnd }
}

function buildMonate(
  events: Array<{ at: string; betrag: number }>,
  z: KundeWirtschaftZeitraum,
  now: Date
): KundeUmsatzMonat[] {
  const { months } = kundeWirtschaftBounds(z, now)
  const list: KundeUmsatzMonat[] = []
  const count = z === 'year' ? now.getMonth() + 1 : months
  const startOffset = z === 'year' ? -now.getMonth() : -(count - 1)

  for (let i = 0; i < count; i++) {
    const d = addMonths(startOfMonth(now), startOffset + i)
    const key = monthKey(d)
    const next = addMonths(d, 1)
    const betrag = events
      .filter((e) => {
        const t = new Date(e.at).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((s, e) => s + e.betrag, 0)
    list.push({ key, label: monthLabel(d), betrag })
  }
  return list
}

function zeitraumLabelKurz(z: KundeWirtschaftZeitraum): string {
  if (z === '6m') return '6 M'
  if (z === '12m') return '12 M'
  if (z === 'year') return 'Jahr'
  return 'Gesamt'
}

export function buildKundeWirtschaft(
  kunde: KundeDetailPayload,
  zeitraum: KundeWirtschaftZeitraum = '12m',
  now = new Date()
): KundeWirtschaftSnapshot {
  const { start, end, months } = kundeWirtschaftBounds(zeitraum, now)
  const events = umsatzEvents(kunde)
  const umsatz = sumInRange(events, start, end)

  let umsatzDeltaPct: number | null = null
  const prev = previousBounds(start, end, months)
  if (prev) {
    const prevUmsatz = sumInRange(events, prev.start, prev.end)
    if (prevUmsatz > 0) {
      umsatzDeltaPct = Math.round(((umsatz - prevUmsatz) / prevUmsatz) * 100)
    } else if (umsatz > 0) {
      umsatzDeltaPct = 100
    } else {
      umsatzDeltaPct = 0
    }
  }

  const offenerBetrag = (kunde.rechnungen ?? [])
    .filter((r) => r.status !== 'bezahlt' && r.status !== 'storniert')
    .reduce((s, r) => s + (Number(r.brutto) || 0), 0)

  const auftraege = kunde.auftraege ?? []
  const aktiveVorgaenge = auftraege.filter((a) =>
    a.status === 'offen' || a.status === 'in_arbeit' || a.status === 'abnahme'
  ).length

  const leads = kunde.leads ?? []
  const anfragen = leads.filter((l) => inBounds(l.created_at, start, end)).length

  const angebotIds = new Set<string>()
  let angebote = 0
  for (const l of leads) {
    for (const ang of l.angebote ?? []) {
      if (!ang?.id || angebotIds.has(ang.id)) continue
      if (!inBounds(ang.created_at ?? l.created_at, start, end)) continue
      angebotIds.add(ang.id)
      angebote += 1
    }
  }
  for (const a of auftraege) {
    const list = Array.isArray(a.angebote) ? a.angebote : a.angebote ? [a.angebote] : []
    for (const ang of list) {
      if (!ang || typeof ang !== 'object') continue
      const id = 'id' in ang && typeof ang.id === 'string' ? ang.id : null
      if (id && angebotIds.has(id)) continue
      const at =
        ('created_at' in ang && typeof ang.created_at === 'string' && ang.created_at) ||
        a.created_at
      if (!inBounds(at, start, end)) continue
      if (id) angebotIds.add(id)
      angebote += 1
    }
  }

  // Fallback: wenn Zeitraum „Gesamt“, alle Counts ohne Datumsfilter
  const anfragenCount =
    zeitraum === 'all' ? leads.length : anfragen
  const angeboteCount = zeitraum === 'all' ? countAllAngebote(kunde) : angebote
  const auftraegeCount =
    zeitraum === 'all'
      ? auftraege.length
      : auftraege.filter((a) => inBounds(a.created_at, start, end)).length

  return {
    zeitraum,
    zeitraumLabelKurz: zeitraumLabelKurz(zeitraum),
    umsatz,
    umsatzDeltaPct: zeitraum === 'all' ? null : umsatzDeltaPct,
    offenerBetrag,
    aktiveVorgaenge,
    auftraegeGesamt: auftraege.length,
    anfragen: anfragenCount,
    angebote: angeboteCount,
    auftraege: auftraegeCount,
    monate: buildMonate(events, zeitraum, now),
  }
}

function countAllAngebote(kunde: KundeDetailPayload): number {
  const ids = new Set<string>()
  for (const l of kunde.leads ?? []) {
    for (const ang of l.angebote ?? []) {
      if (ang?.id) ids.add(ang.id)
    }
  }
  for (const a of kunde.auftraege ?? []) {
    const list = Array.isArray(a.angebote) ? a.angebote : a.angebote ? [a.angebote] : []
    for (const ang of list) {
      if (ang && typeof ang === 'object' && 'id' in ang && typeof ang.id === 'string') {
        ids.add(ang.id)
      } else if (ang) {
        ids.add(`${a.id}-ang`)
      }
    }
  }
  return ids.size
}
