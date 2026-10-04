import { getPublicAppUrl } from '@/lib/utils'

/** Öffentliche Kunden-Projektseite (/projekt/{token}) — immer CRM-Domain. */
export function projektUrlFromToken(
  token: string,
  opts?: { updateId?: string | null }
): string {
  const t = token.trim()
  const base = `${getPublicAppUrl()}/projekt/${encodeURIComponent(t)}`
  const updateId = opts?.updateId?.trim()
  if (!updateId) return base
  return `${base}?update=${encodeURIComponent(updateId)}`
}
