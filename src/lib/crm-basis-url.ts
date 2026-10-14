import 'server-only'

import { headers } from 'next/headers'

import { getPublicAppUrl } from '@/lib/utils'

/**
 * Adresse des CRM, über das gerade gearbeitet wird (für Links in Mails/WhatsApp und Webhooks).
 * Env-Werte können auf Prod fehlen → sonst landete der Link auf localhost.
 */
export function crmBasisUrl(): string {
  try {
    const h = headers()
    const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]!.trim()
    if (host && !/^(localhost|127\.0\.0\.1)(:|$)/.test(host)) {
      const proto = (h.get('x-forwarded-proto') ?? 'https').split(',')[0]!.trim()
      return `${proto}://${host}`
    }
  } catch {
    // außerhalb einer Anfrage (z. B. Skript) → Env-Rückfall
  }
  return getPublicAppUrl()
}
