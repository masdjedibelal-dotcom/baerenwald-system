import type { AuftragPosition } from '@/lib/types';

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
