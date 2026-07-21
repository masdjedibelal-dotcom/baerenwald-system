import type { AuftragPosition } from '@/lib/types'
import { blockSummeVk, type AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'

export type AuftragLeistungStatus = 'offen' | 'in_arbeit' | 'erledigt'

export const LEISTUNG_STATUS_OPTIONS: { value: AuftragLeistungStatus; label: string }[] = [
  { value: 'offen', label: 'Offen' },
  { value: 'in_arbeit', label: 'In Arbeit' },
  { value: 'erledigt', label: 'Erledigt' },
]

export function normalizeLeistungStatus(raw: string | null | undefined): AuftragLeistungStatus {
  const v = (raw ?? 'offen').toLowerCase()
  if (v === 'erledigt') return 'erledigt'
  if (v === 'in_arbeit') return 'in_arbeit'
  return 'offen'
}

/** Fertigstellungsgrad 0–100 aus Leistungsstatus. */
export function leistungCompletionProzent(status: string | null | undefined): number {
  const v = normalizeLeistungStatus(status)
  if (v === 'erledigt') return 100
  if (v === 'in_arbeit') return 50
  return 0
}

export function leistungStatusLabel(status: string | null | undefined): string {
  return LEISTUNG_STATUS_OPTIONS.find((o) => o.value === normalizeLeistungStatus(status))?.label ?? 'Offen'
}

export function leistungStatusBadgeClass(status: string | null | undefined): string {
  const v = normalizeLeistungStatus(status)
  if (v === 'erledigt') return 'leistung-badge-erledigt'
  if (v === 'in_arbeit') return 'leistung-badge-arbeit'
  return 'leistung-badge-offen'
}

export function positionVerkaufspreis(p: AuftragPosition): number {
  return Math.max(0, p.preis_fix ?? 0)
}

/** Preisgewichteter Gesamtfortschritt (0–100). */
export function gewichteterFortschrittProzent(positionen: AuftragPosition[]): number {
  if (!positionen.length) return 0
  const rows = positionen.map((p) => ({
    vk: positionVerkaufspreis(p),
    completion: leistungCompletionProzent(p.leistung_status),
  }))
  const totalVk = rows.reduce((s, r) => s + r.vk, 0)
  if (totalVk <= 0) {
    return Math.round(rows.reduce((s, r) => s + r.completion, 0) / rows.length)
  }
  const weighted = rows.reduce((s, r) => s + r.vk * r.completion, 0)
  return Math.min(100, Math.max(0, Math.round(weighted / totalVk)))
}

/** Anteil am Auftragswert in Prozent (eine Nachkommastelle). */
export function aufwandsanteilProzent(vk: number, gesamtVk: number): number {
  if (gesamtVk <= 0) return 0
  return Math.round((vk / gesamtVk) * 1000) / 10
}

/** Gewerk-Status aus Leistungen: alle erledigt → erledigt, sonst teilweise/in Arbeit. */
export function deriveGewerkLeistungStatus(positionen: AuftragPosition[]): AuftragLeistungStatus {
  if (!positionen.length) return 'offen'
  const statuses = positionen.map((p) => normalizeLeistungStatus(p.leistung_status))
  if (statuses.every((s) => s === 'erledigt')) return 'erledigt'
  if (statuses.some((s) => s === 'erledigt' || s === 'in_arbeit')) return 'in_arbeit'
  return 'offen'
}

export type FortschrittPlan = {
  gesamtPct: number
  gesamtVk: number
  positionAnteilAuftrag: Map<string, number>
  gewerkByKey: Map<
    string,
    { pct: number; status: AuftragLeistungStatus; vk: number; anteilAuftrag: number }
  >
}

export function computeFortschrittPlan(
  positionen: AuftragPosition[],
  gewerkeBlocks: AuftragGewerkBlock[]
): FortschrittPlan {
  const gesamtVk = positionen.reduce((s, p) => s + positionVerkaufspreis(p), 0)
  const gesamtPct = gewichteterFortschrittProzent(positionen)

  const positionAnteilAuftrag = new Map<string, number>()
  for (const p of positionen) {
    positionAnteilAuftrag.set(
      p.id,
      aufwandsanteilProzent(positionVerkaufspreis(p), gesamtVk)
    )
  }

  const gewerkByKey = new Map<
    string,
    { pct: number; status: AuftragLeistungStatus; vk: number; anteilAuftrag: number }
  >()
  for (const block of gewerkeBlocks) {
    const vk = blockSummeVk(block)
    gewerkByKey.set(block.key, {
      pct: gewichteterFortschrittProzent(block.positionen),
      status: deriveGewerkLeistungStatus(block.positionen),
      vk,
      anteilAuftrag: aufwandsanteilProzent(vk, gesamtVk),
    })
  }

  return { gesamtPct, gesamtVk, positionAnteilAuftrag, gewerkByKey }
}
