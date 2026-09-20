/**
 * Einziger erlaubter Schreibpfad für leads.status (P2-5).
 */
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assertKnownStatus,
  buildStatusPatch,
  isStornoStatus,
  type StatusWritePatch,
} from '@/lib/status/write-helpers'

/** Kanonische Lead-Status (inkl. Map-Erweiterungen). */
export const LEAD_WRITE_STATUSES = [
  'neu',
  'kontaktiert',
  'termin',
  'angebot',
  'auftrag',
  'abgeschlossen',
  'abgebrochen',
  'hm_erledigt',
  'storniert',
] as const

export type LeadWriteStatus = (typeof LEAD_WRITE_STATUSES)[number]

/** HV-Freigabe am Lead (org_freigabe_status) — Vertragsszenario. */
export const HV_FREIGABE_STATUSES = [
  'nicht_noetig',
  'ausstehend',
  'beschluss_ausstehend',
  'freigegeben',
  'abgelehnt',
] as const

export type HvFreigabeStatus = (typeof HV_FREIGABE_STATUSES)[number]

export function planLeadStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  const key = status.trim().toLowerCase()
  assertKnownStatus('lead', key, LEAD_WRITE_STATUSES)
  return buildStatusPatch(key, extra, now)
}

export function planHvFreigabeWrite(
  orgFreigabeStatus: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): Record<string, unknown> {
  const key = orgFreigabeStatus.trim().toLowerCase()
  assertKnownStatus('hv_freigabe', key, HV_FREIGABE_STATUSES)
  return {
    org_freigabe_status: key,
    updated_at: now.toISOString(),
    ...extra,
  }
}

export async function writeLeadStatus(
  supabase: SupabaseClient,
  leadId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planLeadStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('leads').update(patch).eq('id', leadId)
}

export async function writeLeadHvFreigabe(
  supabase: SupabaseClient,
  leadId: string,
  orgFreigabeStatus: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planHvFreigabeWrite(orgFreigabeStatus, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('leads').update(patch).eq('id', leadId)
}

export function canStornoLead(fromStatus: string): boolean {
  return !isStornoStatus(fromStatus)
}
