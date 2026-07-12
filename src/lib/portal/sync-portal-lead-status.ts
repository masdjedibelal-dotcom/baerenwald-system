import type { User } from '@supabase/supabase-js'

export type PortalLeadSyncEvent =
  | 'angebot_gesendet'
  | 'auftrag_beauftragt'
  | 'auftrag_abnahme'
  | 'auftrag_abgeschlossen'
  | 'auftrag_storniert'

function siteBaseUrl(): string | null {
  const url = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ''
  ).replace(/\/$/, '')
  return url.includes('baerenwald') ? url : null
}

/** CRM → Website-API: Portal-Lead-Status sync (fire-and-forget, blockiert nicht). */
export async function syncPortalLeadStatus(
  leadId: string | null | undefined,
  event: PortalLeadSyncEvent,
  opts?: { actor?: User | null; skipMieterMail?: boolean }
): Promise<void> {
  const id = leadId?.trim()
  if (!id) return

  const base = siteBaseUrl()
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!base || !secret) {
    console.warn('[syncPortalLeadStatus] NEXT_PUBLIC_SITE_URL oder PARTNER_INTERNAL_API_SECRET fehlt')
    return
  }

  try {
    const res = await fetch(`${base}/api/internal/sync-lead-phase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: id,
        event,
        actorId: opts?.actor?.id ?? null,
        skipMieterMail: opts?.skipMieterMail ?? false,
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[syncPortalLeadStatus]', event, id, res.status, text.slice(0, 200))
    }
  } catch (e) {
    console.error('[syncPortalLeadStatus]', event, id, e)
  }
}

/** Auftragsstatus → Portal-Sync-Event. */
export function portalSyncEventFromAuftragStatus(
  status: string
): PortalLeadSyncEvent | null {
  switch (status) {
    case 'in_arbeit':
      return 'auftrag_beauftragt'
    case 'abnahme':
      return 'auftrag_abnahme'
    case 'abgeschlossen':
      return 'auftrag_abgeschlossen'
    case 'storniert':
      return 'auftrag_storniert'
    default:
      return null
  }
}
