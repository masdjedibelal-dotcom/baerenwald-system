import type { RechnungStatus } from '@/lib/rechnung-config'
import { mahnstufeListenLabel } from '@/lib/rechnungen/mahnverlauf'

export type RechnungListenStatusFilter =
  | ''
  | 'offen'
  | 'entwurf'
  | 'gesendet'
  | 'ueberfaellig'
  | 'bezahlt'
  | 'storniert'

export type RechnungListeFilterRow = {
  status: RechnungStatus | string
  faellig_am?: string | null
  erinnerung_7_sent_at?: string | null
  erinnerung_21_sent_at?: string | null
}

function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-').map((x) => parseInt(x, 10))
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date(NaN)
  return new Date(p[0], p[1] - 1, p[2])
}

export function isRechnungUeberfaellig(r: RechnungListeFilterRow): boolean {
  if (r.status !== 'gesendet' || !r.faellig_am) return false
  const due = parseYmdLocal(r.faellig_am)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

/** Pipeline: Entwurf, Gesendet, Überfällig — ohne Bezahlt/Storniert. */
export function rechnungInRechnungenPipeline(r: RechnungListeFilterRow): boolean {
  const st = (r.status ?? '').toLowerCase()
  if (st === 'bezahlt' || st === 'storniert') return false
  return true
}

export function matchesRechnungStatusFilter(
  r: RechnungListeFilterRow,
  filter: RechnungListenStatusFilter
): boolean {
  if (!filter) return true
  if (filter === 'offen') return rechnungInRechnungenPipeline(r)
  if (filter === 'ueberfaellig') return isRechnungUeberfaellig(r)
  if (filter === 'gesendet') return r.status === 'gesendet' && !isRechnungUeberfaellig(r)
  if (filter === 'entwurf') return r.status === 'entwurf'
  if (filter === 'bezahlt') return r.status === 'bezahlt'
  if (filter === 'storniert') return r.status === 'storniert'
  return true
}

export const RECHNUNG_PIPELINE_STATUS_FILTERS: RechnungListenStatusFilter[] = [
  'offen',
  'entwurf',
  'gesendet',
  'ueberfaellig',
]

export const RECHNUNG_ALLE_STATUS_FILTERS: RechnungListenStatusFilter[] = [
  '',
  'offen',
  'entwurf',
  'gesendet',
  'ueberfaellig',
  'bezahlt',
  'storniert',
]

export const RECHNUNG_STATUS_FILTER_LABELS: Record<RechnungListenStatusFilter, string> = {
  '': 'Alle',
  offen: 'Offen',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  ueberfaellig: 'Überfällig',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

export function countRechnungStatusFilters(
  rows: RechnungListeFilterRow[],
  filters: RechnungListenStatusFilter[]
): Partial<Record<RechnungListenStatusFilter, number>> {
  const counts: Partial<Record<RechnungListenStatusFilter, number>> = {}
  for (const key of filters) {
    if (key === '') {
      counts[''] = rows.length
      continue
    }
    counts[key] = rows.filter((r) => matchesRechnungStatusFilter(r, key)).length
  }
  return counts
}

export function rechnungDisplayStatusLabel(r: RechnungListeFilterRow): string {
  const mahn = mahnstufeListenLabel(r)
  if (isRechnungUeberfaellig(r)) return mahn ? `Überfällig · ${mahn}` : 'Überfällig'
  const st = (r.status ?? '').toLowerCase() as RechnungStatus
  if (st === 'entwurf') return 'Entwurf'
  if (st === 'gesendet') return mahn ? `Gesendet · ${mahn}` : 'Gesendet'
  if (st === 'bezahlt') return 'Bezahlt'
  if (st === 'storniert') return 'Storniert'
  return r.status ?? '—'
}
