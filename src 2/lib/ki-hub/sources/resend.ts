import 'server-only'

import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

/** Resend hat keine einfache Delivery-Rate-API — letzte Mails + Zähler. */
export async function fetchResendSummary(): Promise<KiHubQuelleResult<Record<string, unknown>>> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { status: 'unavailable', error: 'RESEND_API_KEY fehlt' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails?limit=20', {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return { status: 'unavailable', error: `Resend ${res.status}` }
    }
    const json = (await res.json()) as { data?: Array<{ last_event?: string; created_at?: string }> }
    const mails = json.data ?? []
    const delivered = mails.filter((m) => m.last_event === 'delivered').length
    const bounced = mails.filter((m) => m.last_event === 'bounced').length
    return {
      status: 'ok',
      data: {
        letzte_20: mails.length,
        zugestellt: delivered,
        bounce: bounced,
        delivery_rate_pct: mails.length ? Math.round((delivered / mails.length) * 100) : null,
      },
    }
  } catch (e) {
    return {
      status: 'unavailable',
      error: e instanceof Error ? e.message : 'Resend Fehler',
    }
  }
}
