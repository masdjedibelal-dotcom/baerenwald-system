import type { KommunikationListeZeile } from '@/lib/kommunikation/types'

export type KommunikationMailArt = 'system' | 'direkt'

export type KommunikationMailFilter = 'alle' | KommunikationMailArt

const SYSTEM_FROM = 'Bärenwald'

export function isDirektKommunikationMail(typ: string): boolean {
  return typ.startsWith('freitext_') || typ.startsWith('antwort_')
}

export function kommunikationMailArt(row: Pick<KommunikationListeZeile, 'typ'>): KommunikationMailArt {
  return isDirektKommunikationMail(row.typ) ? 'direkt' : 'system'
}

export function kommunikationMailArtLabel(art: KommunikationMailArt): string {
  return art === 'direkt' ? 'Direkt' : 'System'
}

export function kommunikationMailAbsender(
  row: Pick<KommunikationListeZeile, 'typ' | 'von_email' | 'gesendet_von_name'>,
  art?: KommunikationMailArt
): string {
  const resolvedArt = art ?? kommunikationMailArt(row)
  if (resolvedArt === 'system') {
    return row.von_email?.trim() || SYSTEM_FROM
  }
  return row.gesendet_von_name?.trim() || row.von_email?.trim() || 'Team'
}

export function filterKommunikationRows(
  rows: KommunikationListeZeile[],
  filter: KommunikationMailFilter
): KommunikationListeZeile[] {
  const ausgehend = rows.filter((r) => r.richtung !== 'empfangen')
  if (filter === 'alle') return ausgehend
  return ausgehend.filter((r) => kommunikationMailArt(r) === filter)
}
