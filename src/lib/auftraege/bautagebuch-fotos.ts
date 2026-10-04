/** Client-safe helpers (no privileged Supabase client). */

export const BAUTAGEBUCH_MAX_FOTOS = 5

export function bautagebuchFotoUrls(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return []
  return raw.filter(Boolean).slice(0, BAUTAGEBUCH_MAX_FOTOS)
}

/**
 * Anzeige-URLs für CRM (HTTP oder signiert) — parallel.
 * `signUrl` vom Server übergeben (z. B. signedHandwerkerUploadUrl) — kein Default-Import.
 */
export async function resolveBautagebuchFotosForCrm(
  raw: string[] | null | undefined,
  signUrl: (stored: string, expiresIn?: number) => Promise<string | null>,
  expiresIn = 3600
): Promise<string[]> {
  const stored = bautagebuchFotoUrls(raw)
  const resolved = await Promise.all(
    stored.map(async (item) => {
      if (/^https?:\/\//i.test(item)) return item
      return signUrl(item, expiresIn)
    })
  )
  return resolved.filter((u): u is string => Boolean(u))
}
