import 'server-only'

<<<<<<< Updated upstream
=======
import type { SupabaseClient } from '@supabase/supabase-js'
import { logDbError } from '@/lib/errors/log-db-error'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
/**
 * CRM-Server-Queries (auch Joins mit kunden(*)): bei kaputter RLS einmal mit Service Role wiederholen.
 * Dauerhafte Lösung: scripts/sql/fix-portal-token-not-exists.sql in Supabase ausführen.
 */
export async function withCrmReadFallback<T>(
  run: (db: SupabaseClient) => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<{ data: T | null; error: { message: string } | null }> {
  const userDb = createClient()
  let result = await run(userDb)
  if (result.error && !isCrmRlsBypassError(result.error?.message)) {
    logDbError('withCrmReadFallback', result.error)
    return result
  }
  if (!isCrmRlsBypassError(result.error?.message)) return result

  console.warn(
    '[crm] RLS-Fehler — Service-Role-Fallback. ' +
      'Dauerhaft: npm run db:rls-recursion-fix oder db:portal-fix (SQL Editor).',
    result.error?.message
  )
  try {
    result = await run(getSupabaseAdmin())
    if (result.error) logDbError('withCrmReadFallback:serviceRole', result.error)
  } catch (e) {
    console.error('[crm] Service-Role-Fallback fehlgeschlagen', e)
    logDbError('withCrmReadFallback:serviceRoleCatch', e)
    return result
  }
  return result
}

>>>>>>> Stashed changes
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
