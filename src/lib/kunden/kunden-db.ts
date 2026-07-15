import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

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

/**
 * CRM-Server-Queries (auch Joins mit kunden(*)): bei kaputter RLS einmal mit Service Role wiederholen.
 * Dauerhafte Lösung: scripts/sql/fix-portal-token-not-exists.sql in Supabase ausführen.
 */
export async function withCrmReadFallback<T>(
  run: (db: SupabaseClient) => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<{ data: T | null; error: { message: string } | null }> {
  const userDb = createClient()
  let result = await run(userDb)
  if (!isCrmRlsBypassError(result.error?.message)) return result

  console.warn(
    '[crm] RLS-Fehler — Service-Role-Fallback. ' +
      'Dauerhaft: npm run db:rls-recursion-fix oder db:portal-fix (SQL Editor).',
    result.error?.message
  )
  result = await run(getSupabaseAdmin())
  return result
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

/** @deprecated Alias — bitte withCrmReadFallback verwenden */
export const withKundenReadClient = withCrmReadFallback
