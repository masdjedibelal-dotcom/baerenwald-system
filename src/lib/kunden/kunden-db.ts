import 'server-only'

/** Alte RLS-Policies referenzieren noch kunden.portal_token nach Spalten-Drop. */
export function isPortalTokenSchemaError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('portal_token') && m.includes('does not exist')
}

/** Partner-RLS: Unterabfragen angebote ↔ leads/kunden ohne security-definer-Helfer. */
export function isRlsRecursionError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('infinite recursion') && m.includes('policy')
}

export function isCrmRlsBypassError(message: string | undefined | null): boolean {
  return isPortalTokenSchemaError(message) || isRlsRecursionError(message)
}

/** Fehlermeldung für Listen-Seiten, wenn DB noch nicht repariert ist. */
export function portalTokenFixHint(): string {
  return 'Bitte in Supabase einmal ausführen: scripts/sql/fix-angebote-rls-recursion.sql (oder npm run db:rls-recursion-fix).'
}

export function crmRlsFixHint(message?: string | null): string | null {
  if (isRlsRecursionError(message)) {
    return 'Bitte in Supabase ausführen: scripts/sql/fix-angebote-rls-recursion.sql'
  }
  if (isPortalTokenSchemaError(message)) {
    return 'Bitte in Supabase ausführen: scripts/sql/fix-portal-token-not-exists.sql'
  }
  return null
}
