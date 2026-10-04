

export function kundeIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/kunden\/([^/]+)/)
  if (!m) return null
  return m[1]
}

export function kundenFullBleedSubRoute(pathname: string): boolean {
  void pathname
  return false
}

export function handwerkerFullBleedSubRoute(pathname: string): boolean {
  void pathname
  return false
}
