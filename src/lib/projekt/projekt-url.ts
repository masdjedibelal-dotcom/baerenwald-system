import { getPublicAppUrl } from '@/lib/utils'

function projektBaseUrl(): string {
  return getPublicAppUrl()
}

/** Öffentliche Kunden-Projektseite (/projekt/{token}). */
export function projektUrlFromToken(
  token: string,
  opts?: { updateId?: string | null }
): string {
  const t = token.trim()
  const base = `${projektBaseUrl()}/projekt/${encodeURIComponent(t)}`
  const updateId = opts?.updateId?.trim()
  if (!updateId) return base
  return `${base}?update=${encodeURIComponent(updateId)}`
}

/** CRM-Auftrag inkl. Sprung zum Bautagebuch-Eintrag (intern). */
export function auftragBautagebuchEintragUrl(auftragId: string, eintragId: string): string {
  const id = auftragId.trim()
  const eid = eintragId.trim()
  return `${projektBaseUrl()}/auftraege/${encodeURIComponent(id)}#auftrag-bautagebuch&eintrag=${encodeURIComponent(eid)}`
}
