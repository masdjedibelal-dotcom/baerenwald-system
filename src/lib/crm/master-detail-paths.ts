/** Client-sichere Pfad-Helfer für Master-Detail-Layouts (kein server-only). */

export function anfrageIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/anfragen\/([^/]+)/)
  if (!m) return null
  const id = m[1]
  if (id === 'neu') return null
  return id
}

export function anfragenFullBleedSubRoute(pathname: string): boolean {
  return /\/anfragen\/[^/]+\/angebote(\/|$)/.test(pathname) || pathname === '/anfragen/neu'
}

export function angebotIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/angebote\/([^/]+)/)
  if (!m) return null
  const id = m[1]
  if (id === 'neu') return null
  return id
}

export function angeboteFullBleedSubRoute(pathname: string): boolean {
  return (
    pathname === '/angebote/neu' ||
    /\/angebote\/[^/]+\/bearbeiten(\/|$)/.test(pathname) ||
    /\/angebote\/[^/]+\/visualisierung(\/|$)/.test(pathname)
  )
}

export function auftragIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/auftraege\/([^/]+)/)
  if (!m) return null
  const id = m[1]
  if (id === 'neu') return null
  return id
}

export function auftraegeFullBleedSubRoute(pathname: string): boolean {
  return /\/auftraege\/[^/]+\/(abnahme|abschluss|finanzen|rechnungen-auswahl)(\/|$)/.test(
    pathname
  )
}

export function kundeIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/kunden\/([^/]+)/)
  if (!m) return null
  return m[1]
}

export function kundenFullBleedSubRoute(pathname: string): boolean {
  void pathname
  return false
}

export function rechnungIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/rechnungen\/([^/]+)/)
  if (!m) return null
  const id = m[1]
  if (id === 'neu') return null
  return id
}

export function rechnungenFullBleedSubRoute(pathname: string): boolean {
  return pathname === '/rechnungen/neu'
}

export function partnerIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/partner\/([^/]+)/)
  if (!m) return null
  return m[1]
}

export function partnerFullBleedSubRoute(pathname: string): boolean {
  void pathname
  return false
}

export function handwerkerIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/handwerker\/([^/]+)/)
  if (!m) return null
  return m[1]
}

export function handwerkerFullBleedSubRoute(pathname: string): boolean {
  void pathname
  return false
}
