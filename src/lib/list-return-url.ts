/**
 * N5/C: Zurück zur Herkunftsliste über `return`-Parameter.
 * Fallback: Default-Liste der Entity — nie Dashboard `/`.
 */

const ALLOWED_LIST_PREFIXES = [
  '/vorgaenge',
  '/anfragen',
  '/angebote',
  '/auftraege',
  '/rechnungen',
  '/kunden',
  '/handwerker',
  '/partner',
  '/kalender',
  '/objektakte',
] as const

export function buildListReturnUrl(
  listPathWithQuery: string,
  detailPath: string
): string {
  const base = detailPath.split('?')[0] ?? detailPath
  const ret = listPathWithQuery.startsWith('/')
    ? listPathWithQuery
    : `/${listPathWithQuery}`
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}return=${encodeURIComponent(ret)}`
}

/** Liest `return` aus SearchParams oder Query-String. */
export function parseReturn(
  searchParams: URLSearchParams | { get(name: string): string | null },
  fallbackListHref: string
): string {
  const raw = searchParams.get('return')?.trim()
  if (!raw) return sanitizeListHref(fallbackListHref)
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  return sanitizeListHref(decoded, fallbackListHref)
}

function sanitizeListHref(href: string, fallback = '/vorgaenge'): string {
  const h = href.trim()
  if (!h.startsWith('/') || h.startsWith('//')) return fallback
  if (h === '/' || h.startsWith('/?')) return fallback
  const pathOnly = h.split('?')[0] ?? h
  const ok = ALLOWED_LIST_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`)
  )
  if (!ok) return fallback
  return h
}

/** Default-Liste je Detail-Pfad (nie Dashboard). */
export function defaultListHrefForDetail(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? ''
  switch (seg) {
    case 'anfragen':
      return '/vorgaenge?tab=anfrage'
    case 'angebote':
      return '/vorgaenge?tab=angebot'
    case 'auftraege':
      return '/vorgaenge?tab=auftrag'
    case 'rechnungen':
      return '/vorgaenge?tab=rechnung'
    case 'kunden':
      return '/kunden'
    case 'handwerker':
      return '/handwerker'
    case 'partner':
      return '/partner'
    default:
      return '/vorgaenge'
  }
}
