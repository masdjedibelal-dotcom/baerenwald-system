/** Eintrag in angebote.fotos_urls (JSONB) — abwärtskompatibel zu reinen URL-Strings. */
export type AngebotProjektFoto = {
  url: string
  beschreibung: string
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

export function parseProjektFotos(raw: unknown): AngebotProjektFoto[] {
  if (raw == null) return []
  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    try {
      return parseProjektFotos(JSON.parse(raw) as unknown)
    } catch {
      return []
    }
  } else {
    return []
  }

  const out: AngebotProjektFoto[] = []
  for (const item of arr) {
    if (typeof item === 'string' && isHttpUrl(item)) {
      out.push({ url: item.trim(), beschreibung: '' })
      continue
    }
    if (item && typeof item === 'object') {
      const o = item as { url?: unknown; beschreibung?: unknown }
      const url = typeof o.url === 'string' ? o.url.trim() : ''
      if (!isHttpUrl(url)) continue
      const beschreibung =
        typeof o.beschreibung === 'string' ? o.beschreibung.trim() : ''
      out.push({ url, beschreibung })
    }
  }
  return out
}

export function projektFotoUrls(fotos: AngebotProjektFoto[]): string[] {
  return fotos.map((f) => f.url)
}
