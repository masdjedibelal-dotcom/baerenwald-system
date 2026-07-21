/** Handwerker-Stammdaten speichern Gewerk-Slugs (case-insensitiv vergleichen). */
export function normalizeGewerkSlug(slug: string | null | undefined): string {
  return slug?.trim().toLowerCase() ?? ''
}

export function handwerkerHatGewerkSlug(
  gewerke: string[] | null | undefined,
  slug: string | null | undefined
): boolean {
  const want = normalizeGewerkSlug(slug)
  if (!want) return false
  return (gewerke ?? []).some((g) => normalizeGewerkSlug(g) === want)
}

export function filterHandwerkerFuerGewerkSlug<T extends { gewerke?: string[] | null }>(
  handwerker: T[],
  slug: string | null | undefined
): T[] {
  const want = normalizeGewerkSlug(slug)
  if (!want) return handwerker
  return handwerker.filter((h) => handwerkerHatGewerkSlug(h.gewerke, want))
}
