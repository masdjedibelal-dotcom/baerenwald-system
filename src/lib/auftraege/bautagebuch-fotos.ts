export const BAUTAGEBUCH_MAX_FOTOS = 5

export function bautagebuchFotoUrls(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return []
  return raw.filter(Boolean).slice(0, BAUTAGEBUCH_MAX_FOTOS)
}

/** Anzeige-URLs für CRM (HTTP oder signiert aus handwerker-uploads). */
export async function resolveBautagebuchFotosForCrm(
  raw: string[] | null | undefined,
  signUrl: (stored: string, expiresIn?: number) => Promise<string | null>,
  expiresIn = 3600
): Promise<string[]> {
  const stored = bautagebuchFotoUrls(raw)
  const out: string[] = []
  for (const item of stored) {
    if (/^https?:\/\//i.test(item)) {
      out.push(item)
      continue
    }
    const signed = await signUrl(item, expiresIn)
    if (signed) out.push(signed)
  }
  return out
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
