/**
 * CRM → Portal: Lead-Phase nach Auftrag abgeschlossen/storniert.
 * Shared DB: lokal leads patchen + optional Portal-Notify via internal API.
 * @see handwerks-plattform/src/lib/vorgang/sync-lead-from-crm.ts
 * @see handwerks-plattform/src/app/api/internal/sync-lead-phase/route.ts
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AuftragStatus } from '@/lib/types'

type SyncEvent = 'auftrag_abgeschlossen' | 'auftrag_storniert'

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

function eventForStatus(status: string): SyncEvent | null {
  if (status === 'abgeschlossen') return 'auftrag_abgeschlossen'
  if (status === 'storniert') return 'auftrag_storniert'
  return null
}

/** Gleiche Semantik wie Portal syncLeadFromCrm für Abschluss/Storno. */
function leadPatchForEvent(event: SyncEvent): {
  vorgang_phase: string
  hv_meldung_status: string
} {
  if (event === 'auftrag_abgeschlossen') {
    return { vorgang_phase: 'abgeschlossen', hv_meldung_status: 'abgeschlossen' }
  }
  return { vorgang_phase: 'abgelehnt', hv_meldung_status: 'abgelehnt' }
}

async function notifyPortalSyncLeadPhase(input: {
  leadId: string
  event: SyncEvent
  skipMieterMail: boolean
}): Promise<void> {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    console.warn(
      '[syncPortalLeadStatus] PARTNER_INTERNAL_API_SECRET fehlt — Portal-Notify übersprungen.'
    )
    return
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/sync-lead-phase`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: input.leadId,
        event: input.event,
        skipMieterMail: input.skipMieterMail,
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error?.trim()) detail = body.error.trim()
      } catch {
        /* ignore */
      }
      console.warn('[syncPortalLeadStatus] Portal-API:', detail)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    console.error('[syncPortalLeadStatus] Portal-API Fehler:', msg)
  }
}

/**
 * Nach Auftragsabschluss/-storno: Portal-Lead (HV) synchronisieren.
 * Fehler blockieren den Auftrag-Update nie.
 */
export async function syncPortalLeadStatusAfterAuftragChange(input: {
  auftragId: string
  status: AuftragStatus | string
  leadId?: string | null
  skipMieterMail?: boolean
}): Promise<void> {
  try {
    const event = eventForStatus(input.status)
    if (!event) return

    const skipMieterMail = input.skipMieterMail !== false
    let leadId = input.leadId?.trim() || null

    if (!leadId) {
      const { data: auf, error } = await supabaseAdmin
        .from('auftraege')
        .select('lead_id')
        .eq('id', input.auftragId)
        .maybeSingle()
      if (error) {
        console.warn('[syncPortalLeadStatus] Auftrag laden:', error.message)
        return
      }
      leadId = (auf?.lead_id as string | null)?.trim() || null
    }
    if (!leadId) return

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id, auftraggeber_kunde_id, hv_meldung_status')
      .eq('id', leadId)
      .maybeSingle()

    if (leadErr) {
      console.warn('[syncPortalLeadStatus] Lead laden:', leadErr.message)
      return
    }
    if (!lead?.id) return
    if (!(lead.auftraggeber_kunde_id as string | null)?.trim()) return

    const patch = leadPatchForEvent(event)
    // Storno: hv_meldung_status nur patchen wenn schon HV-Status vorhanden
    const update: Record<string, unknown> = {
      vorgang_phase: patch.vorgang_phase,
      updated_at: new Date().toISOString(),
    }
    const prevHv = (lead.hv_meldung_status as string | null)?.trim()
    if (event === 'auftrag_abgeschlossen' || prevHv) {
      update.hv_meldung_status = patch.hv_meldung_status
    }

    const { error: upErr } = await supabaseAdmin.from('leads').update(update).eq('id', leadId)
    if (upErr) {
      console.error('[syncPortalLeadStatus] Lead-Update:', upErr.message)
    }

    await notifyPortalSyncLeadPhase({ leadId, event, skipMieterMail })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[syncPortalLeadStatus]', msg)
  }
}
