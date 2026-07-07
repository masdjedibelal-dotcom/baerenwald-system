import type { AngebotHandwerkerRow } from '@/lib/types'

export const PARTNER_UPLOAD_BUCKET = 'handwerker-uploads'

export type HwEinreichungStatus =
  | 'offen'
  | 'eingereicht'
  | 'bestaetigt'
  | 'abgelehnt'
  | 'uebernommen'
  | 'rueckfrage'
  | string

export function hwStatusLabel(status: string | null | undefined): string {
  const v = (status ?? '').toLowerCase()
  if (v === 'eingereicht') return 'Eingereicht'
  if (v === 'bestaetigt') return 'Warte auf HW-Bestätigung'
  if (v === 'uebernommen') return 'Übernommen'
  if (v === 'abgelehnt') return 'Abgelehnt'
  if (v === 'rueckfrage') return 'Rückfrage'
  if (v === 'offen') return 'Offen'
  return status?.trim() || '—'
}

export function hwStatusBadgeClass(status: string | null | undefined): string {
  const v = (status ?? '').toLowerCase()
  if (v === 'eingereicht') return 'bg-blue-100 text-blue-900'
  if (v === 'bestaetigt') return 'bg-violet-100 text-violet-900'
  if (v === 'uebernommen') return 'bg-emerald-100 text-emerald-900'
  if (v === 'abgelehnt') return 'bg-red-100 text-red-900'
  if (v === 'rueckfrage') return 'bg-amber-100 text-amber-950'
  return 'bg-canvas text-muted'
}

export function kannHwEinreichungPruefen(row: Pick<AngebotHandwerkerRow, 'hw_status' | 'hw_eingereicht_at'>): boolean {
  if (!hasHwEinreichung(row)) return false
  return (row.hw_status ?? '').toLowerCase() === 'eingereicht'
}

/** EK netto für Auftragspositionen — bevorzugt Netto, sonst Brutto / 1,19 */
export function ekNettoFromHwEinreichung(row: Pick<AngebotHandwerkerRow, 'hw_preis_netto' | 'hw_preis_brutto'>): number | null {
  const netto = row.hw_preis_netto != null ? Number(row.hw_preis_netto) : null
  if (netto != null && Number.isFinite(netto) && netto > 0) return Math.round(netto * 100) / 100
  const brutto = row.hw_preis_brutto != null ? Number(row.hw_preis_brutto) : null
  if (brutto != null && Number.isFinite(brutto) && brutto > 0) {
    return Math.round((brutto / 1.19) * 100) / 100
  }
  return null
}

export function hasHwEinreichung(
  row: Pick<AngebotHandwerkerRow, 'hw_eingereicht_at'>
): boolean {
  return Boolean(row.hw_eingereicht_at?.trim())
}

export function buildGewerkEkMap(rows: AngebotHandwerkerRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!hasHwEinreichung(r)) continue
    const ek = ekNettoFromHwEinreichung(r)
    if (ek != null && ek > 0) map.set(r.gewerk_id, ek)
  }
  return map
}

export function storagePathFromHwPdfStored(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const raw = stored.trim()
  if (/^https?:\/\//i.test(raw)) return null
  return raw.startsWith(`${PARTNER_UPLOAD_BUCKET}/`)
    ? raw.slice(`${PARTNER_UPLOAD_BUCKET}/`.length)
    : raw
}
