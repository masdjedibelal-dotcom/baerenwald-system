/**
 * Org-Hausmeister: Personenstamm + Objekt-Zuordnung (1:1 Objekt→HM).
 * Gleiche Tabellen wie Portal (`org_hausmeister` / `hausmeister_objekte`).
 */

import { logDbError } from '@/lib/errors/log-db-error'
import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { HausmeisterAmObjekt,OrgHausmeister } from '@/lib/org/org-hausmeister-types'

export type { HausmeisterAmObjekt, OrgHausmeister } from '@/lib/org/org-hausmeister-types'

function mapHm(row: Record<string, unknown>): OrgHausmeister {
  return {
    id: String(row.id),
    org_kunde_id: String(row.org_kunde_id),
    name: String(row.name ?? '').trim() || 'Hausmeister',
    email: row.email != null ? String(row.email).trim() || null : null,
    portal_zugang: Boolean(row.portal_zugang),
    portal_kunde_id: row.portal_kunde_id != null ? String(row.portal_kunde_id) : null,
  }
}

export async function listOrgHausmeister(orgKundeId: string): Promise<OrgHausmeister[]> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('org_hausmeister')
    .select('id, org_kunde_id, name, email, portal_zugang, portal_kunde_id')
    .eq('org_kunde_id', orgKundeId)
    .order('name', { ascending: true })
  if (error) logDbError('lib/org/org-hausmeister:org_hausmeister', error)
  if (error) {
    console.warn('[org-hausmeister] list:', error.message)
    return []
  }
  return (data ?? []).map((r) => mapHm(r as Record<string, unknown>))
}

export async function loadHausmeisterForObjekt(
  kundeObjektId: string | null | undefined
): Promise<HausmeisterAmObjekt | null> {
  const oid = String(kundeObjektId ?? '').trim()
  if (!oid) return null

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('hausmeister_objekte')
    .select(
      'kunde_objekt_id, org_hausmeister:org_hausmeister_id(id, org_kunde_id, name, email, portal_zugang, portal_kunde_id)'
    )
    .eq('kunde_objekt_id', oid)
    .maybeSingle()
  if (error) logDbError('lib/org/org-hausmeister:hausmeister_objekte', error)

  if (error) {
    return loadLegacyKontaktAsHm(oid)
  }

  const joined = data?.org_hausmeister as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
    | undefined
  const hmRaw = Array.isArray(joined) ? joined[0] ?? null : joined ?? null
  if (!hmRaw?.id) return loadLegacyKontaktAsHm(oid)

  return {
    ...mapHm(hmRaw),
    kunde_objekt_id: oid,
  }
}

async function loadLegacyKontaktAsHm(oid: string): Promise<HausmeisterAmObjekt | null> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('objekt_kontakte')
    .select('id, name, email, telefon, kunde_id')
    .eq('kunde_objekt_id', oid)
    .eq('rolle', 'hausmeister')
    .eq('aktiv', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) logDbError('lib/org/org-hausmeister:objekt_kontakte', error)
  if (!data?.id) return null
  return {
    id: String(data.id),
    org_kunde_id: String((data as { kunde_id?: string }).kunde_id ?? ''),
    name: String(data.name ?? '').trim() || 'Hausmeister',
    email: data.email != null ? String(data.email).trim() || null : null,
    portal_zugang: false,
    portal_kunde_id: null,
    kunde_objekt_id: oid,
    isLegacy: true,
  }
}
