import type { LeadNotizRow } from '@/lib/types'

export const TERMIN_NOTIZ_MAX_FOTOS = 15

export function leadNotizFotoUrls(
  notiz: Pick<LeadNotizRow, 'datei_url' | 'datei_urls'>
): string[] {
  const fromArray = (notiz.datei_urls ?? []).map((u) => u?.trim()).filter(Boolean) as string[]
  if (fromArray.length) return fromArray
  const single = notiz.datei_url?.trim()
  return single ? [single] : []
}
