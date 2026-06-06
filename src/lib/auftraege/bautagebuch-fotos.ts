export const BAUTAGEBUCH_MAX_FOTOS = 5

export function bautagebuchFotoUrls(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return []
  return raw.filter(Boolean).slice(0, BAUTAGEBUCH_MAX_FOTOS)
}

export function mergeBautagebuchFotoUrls(existing: string[], added: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of [...existing, ...added]) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
    if (out.length >= BAUTAGEBUCH_MAX_FOTOS) break
  }
  return out
}
