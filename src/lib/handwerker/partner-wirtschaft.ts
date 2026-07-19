import type { HandwerkerDetailPayload } from '@/app/(dashboard)/handwerker/actions'
import {
  kundeWirtschaftBounds,
  type KundeWirtschaftZeitraum,
} from '@/lib/kunden/kunde-wirtschaft'

export type PartnerWirtschaftZeitraum = KundeWirtschaftZeitraum

export { KUNDE_WIRTSCHAFT_ZEITRAUM as PARTNER_WIRTSCHAFT_ZEITRAUM } from '@/lib/kunden/kunde-wirtschaft'

export type PartnerUmsatzMonat = {
  key: string
  label: string
  betrag: number
}

export type PartnerGewerkVolumen = {
  name: string
  betrag: number
  anteil: number
}

export type PartnerWirtschaftSnapshot = {
  zeitraum: PartnerWirtschaftZeitraum
  zeitraumLabelKurz: string
  umsatz: number
  umsatzDeltaPct: number | null
  offenesVolumen: number
  aktiveEinsaetze: number
  anfragenGesamt: number
  monate: PartnerUmsatzMonat[]
  gewerke: PartnerGewerkVolumen[]
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

function inBounds(iso: string | null | undefined, start: Date | null, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (t > end.getTime()) return false
  if (start && t < start.getTime()) return false
  return true
}

function isAktiv(auftragStatus: string): boolean {
  return auftragStatus !== 'abgeschlossen' && auftragStatus !== 'storniert'
}

function zeitraumLabelKurz(z: PartnerWirtschaftZeitraum): string {
  if (z === '6m') return '6 M'
  if (z === '12m') return '12 M'
  if (z === 'year') return 'Jahr'
  return 'Gesamt'
}

function previousBounds(
  start: Date | null,
  end: Date,
  months: number
): { start: Date; end: Date } | null {
  if (!start) return null
  const prevEnd = new Date(start.getTime())
  const prevStart = startOfMonth(addMonths(start, -months))
  return { start: prevStart, end: prevEnd }
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

function buildMonate(
  events: Array<{ at: string; betrag: number }>,
  z: PartnerWirtschaftZeitraum,
  now: Date
): PartnerUmsatzMonat[] {
  const { months } = kundeWirtschaftBounds(z, now)
  const count = z === 'year' ? now.getMonth() + 1 : months
  const startOffset = z === 'year' ? -now.getMonth() : -(count - 1)
  const list: PartnerUmsatzMonat[] = []

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

export function buildPartnerWirtschaft(
  payload: HandwerkerDetailPayload,
  zeitraum: PartnerWirtschaftZeitraum = '12m',
  now = new Date()
): PartnerWirtschaftSnapshot {
  const { start, end, months } = kundeWirtschaftBounds(zeitraum, now)
  const auftraege = payload.auftraege ?? []

  const events = auftraege
    .filter((a) => a.auftrag_status !== 'storniert')
    .map((a) => ({
      at: a.created_at,
      betrag: Number(a.vereinbarter_preis) || 0,
    }))
    .filter((e) => e.betrag > 0 && e.at)

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

  const aktiv = auftraege.filter((a) => isAktiv(a.auftrag_status))
  const offenesVolumen = aktiv.reduce((s, a) => s + (Number(a.vereinbarter_preis) || 0), 0)

  const gewerkMap = new Map<string, number>()
  for (const a of auftraege) {
    if (a.auftrag_status === 'storniert') continue
    if (zeitraum !== 'all' && !inBounds(a.created_at, start, end)) continue
    const name = (a.gewerk_name ?? '').trim() || 'Sonstiges'
    const betrag = Number(a.vereinbarter_preis) || 0
    if (betrag <= 0) continue
    gewerkMap.set(name, (gewerkMap.get(name) ?? 0) + betrag)
  }
  const gewerkGesamt = Array.from(gewerkMap.values()).reduce((s, n) => s + n, 0)
  const gewerke: PartnerGewerkVolumen[] = Array.from(gewerkMap.entries())
    .map(([name, betrag]) => ({
      name,
      betrag,
      anteil: gewerkGesamt > 0 ? Math.round((betrag / gewerkGesamt) * 100) : 0,
    }))
    .sort((a, b) => b.betrag - a.betrag)
    .slice(0, 6)

  return {
    zeitraum,
    zeitraumLabelKurz: zeitraumLabelKurz(zeitraum),
    umsatz,
    umsatzDeltaPct: zeitraum === 'all' ? null : umsatzDeltaPct,
    offenesVolumen,
    aktiveEinsaetze: aktiv.length,
    anfragenGesamt: payload.stats?.angefragt ?? 0,
    monate: buildMonate(events, zeitraum, now),
    gewerke,
  }
}
