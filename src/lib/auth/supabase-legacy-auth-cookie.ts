/**
 * Legacy-Cookie vom gleichen Supabase-Projekt-Ref (Default-Name ohne App-Prefix).
 * Frühere CRM-Callbacks / Portal-Logins haben ihn geschrieben — auf localhost
 * teilen sich CRM (:3001) und Portal (:3000) denselben Cookie-Jar.
 */
export function supabaseLegacyAuthCookieBaseName(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) return null
  try {
    const host = new URL(url).hostname
    const ref = host.split('.')[0]
    if (!ref) return null
    return `sb-${ref}-auth-token`
  } catch {
    return null
  }
}

/** Alle Chunks eines Cookie-Namens (name, name.0, name.1, …). */
export function matchAuthCookieNames(
  allNames: string[],
  baseName: string
): string[] {
  return allNames.filter(
    (n) => n === baseName || n.startsWith(`${baseName}.`)
  )
}
