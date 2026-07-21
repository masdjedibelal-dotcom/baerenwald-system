import type { VorgangListeRow } from '@/lib/vorgang/types'

/** Normalisiert Partner-/Suchtext für robustes Matching. */
export function normalizePartnerFilterText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß@.+&/-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function partnerFilterTokens(value: string): string[] {
  const norm = normalizePartnerFilterText(value)
  if (!norm) return []
  return norm.split(' ').filter((t) => t.length >= 2)
}

function vorgangSearchHaystack(row: VorgangListeRow): string {
  return normalizePartnerFilterText(
    [row.titel, row.kundeName, row.kanalMeta, row.unterstatusLabel, row.entityId]
      .filter(Boolean)
      .join(' ')
  )
}

/**
 * Partner-Vorgänge ohne DB-FK: Treffer wenn Partnername (oder Alias) im Vorgangstext vorkommt.
 * Mindestens ein signifikanter Token muss matchen; kurze Namen (<3 Zeichen) nur als Ganzes.
 */
export function vorgangMatchesPartnerName(
  row: VorgangListeRow,
  partnerName: string,
  aliases: string[] = []
): boolean {
  const needles = [partnerName, ...aliases].map(normalizePartnerFilterText).filter(Boolean)
  if (!needles.length) return false

  const hay = vorgangSearchHaystack(row)
  if (!hay) return false

  return needles.some((needle) => {
    if (needle.length < 3) return hay.split(' ').includes(needle)
    if (hay.includes(needle)) return true
    const tokens = partnerFilterTokens(needle)
    if (!tokens.length) return false
    return tokens.some((token) => hay.includes(token))
  })
}

export function filterVorgaengeByPartnerName(
  rows: VorgangListeRow[],
  partnerName: string,
  aliases: string[] = []
): VorgangListeRow[] {
  const needle = partnerName.trim()
  if (!needle) return rows
  return rows.filter((row) => vorgangMatchesPartnerName(row, needle, aliases))
}
