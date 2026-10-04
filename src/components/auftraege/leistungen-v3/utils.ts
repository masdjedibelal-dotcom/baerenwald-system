import type { AuftragPosition } from '@/lib/types'
import { formatDatumZeitraum } from '@/lib/utils'

export function formatZeitraumKurz(pos: AuftragPosition): string | null {
  const von = pos.start_datum?.slice(0, 10)
  const bis = pos.end_datum?.slice(0, 10)
  if (!von && !bis) return null
  if (von && !bis) return `ab ${formatDatumZeitraum(von, null)}`
  if (!von && bis) return `bis ${formatDatumZeitraum(null, bis)}`
  const s = formatDatumZeitraum(von, bis)
  return s === '—' ? null : s
}

export function handwerkerInitialen(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}
