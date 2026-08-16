/**
 * Org-Hausmeister: Personenstamm + Objekt-Zuordnung (1:1 Objekt→HM).
 * Gleiche Tabellen wie Portal (`org_hausmeister` / `hausmeister_objekte`).
 */

import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  buildPortalEinladungUrl,
  createPortalEinladungToken,
  portalEinladungExpiresAt,
} from '@/lib/portal/portal-einladungen'
import type { HausmeisterAmObjekt, OrgHausmeister } from '@/lib/org/org-hausmeister-types'

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
  const { data } = await db
    .from('objekt_kontakte')
    .select('id, name, email, telefon, kunde_id')
    .eq('kunde_objekt_id', oid)
    .eq('rolle', 'hausmeister')
    .eq('aktiv', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
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

export async function upsertOrgHausmeister(input: {
  orgKundeId: string
  id?: string | null
  name: string
  email?: string | null
  portalZugang: boolean
}): Promise<{ ok: true; hm: OrgHausmeister } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name des Hausmeisters fehlt.' }
  const email = input.email?.trim().toLowerCase() || null
  if (input.portalZugang && !email) {
    return { ok: false, error: 'E-Mail ist für Portal-Zugang erforderlich.' }
  }

  const db = getSupabaseAdmin()

  if (input.id?.trim()) {
    const { data, error } = await db
      .from('org_hausmeister')
      .update({
        name,
        email,
        portal_zugang: input.portalZugang,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id.trim())
      .eq('org_kunde_id', input.orgKundeId)
      .select('id, org_kunde_id, name, email, portal_zugang, portal_kunde_id')
      .single()
    if (error || !data) {
      return { ok: false, error: error?.message ?? 'Speichern fehlgeschlagen.' }
    }
    return { ok: true, hm: mapHm(data as Record<string, unknown>) }
  }

  const { data, error } = await db
    .from('org_hausmeister')
    .insert({
      org_kunde_id: input.orgKundeId,
      name,
      email,
      portal_zugang: input.portalZugang,
    })
    .select('id, org_kunde_id, name, email, portal_zugang, portal_kunde_id')
    .single()
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Anlegen fehlgeschlagen.' }
  }
  return { ok: true, hm: mapHm(data as Record<string, unknown>) }
}

export async function assignHausmeisterToObjekt(input: {
  orgKundeId: string
  objektId: string
  orgHausmeisterId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getSupabaseAdmin()
  const { data: hm } = await db
    .from('org_hausmeister')
    .select('id')
    .eq('id', input.orgHausmeisterId)
    .eq('org_kunde_id', input.orgKundeId)
    .maybeSingle()
  if (!hm?.id) return { ok: false, error: 'Hausmeister nicht gefunden.' }

  const { error: delErr } = await db
    .from('hausmeister_objekte')
    .delete()
    .eq('kunde_objekt_id', input.objektId)
  if (delErr && !/does not exist|relation/i.test(delErr.message)) {
    return { ok: false, error: delErr.message }
  }

  const { error } = await db.from('hausmeister_objekte').insert({
    org_hausmeister_id: input.orgHausmeisterId,
    kunde_objekt_id: input.objektId,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function unassignHausmeisterFromObjekt(
  objektId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const oid = objektId.trim()
  if (!oid) return { ok: false, error: 'Objekt fehlt.' }
  const db = getSupabaseAdmin()
  const { error } = await db.from('hausmeister_objekte').delete().eq('kunde_objekt_id', oid)
  if (error && !/does not exist|relation/i.test(error.message)) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function createHausmeisterEinladung(input: {
  orgKundeId: string
  orgHausmeisterId: string
  objektId: string
  createdBy?: string | null
}): Promise<{ ok: true; url: string; token: string } | { ok: false; error: string }> {
  const db = getSupabaseAdmin()
  const { data: hm } = await db
    .from('org_hausmeister')
    .select('id, email, portal_zugang, name')
    .eq('id', input.orgHausmeisterId)
    .eq('org_kunde_id', input.orgKundeId)
    .maybeSingle()
  if (!hm?.id) return { ok: false, error: 'Hausmeister nicht gefunden.' }
  if (!hm.portal_zugang || !String(hm.email ?? '').trim()) {
    return { ok: false, error: 'Kein Portal-Zugang / keine E-Mail.' }
  }

  const token = createPortalEinladungToken()
  const expires_at = portalEinladungExpiresAt().toISOString()
  const { data, error } = await db
    .from('portal_einladungen')
    .insert({
      token,
      kunde_id: input.orgKundeId,
      objekt_id: input.objektId,
      org_hausmeister_id: input.orgHausmeisterId,
      status: 'offen',
      expires_at,
      created_by: input.createdBy ?? null,
    })
    .select('token')
    .single()

  if (error) {
    const missing = /org_hausmeister_id|does not exist|relation/i.test(error.message)
    return {
      ok: false,
      error: missing
        ? 'Hausmeister-Einladungen noch nicht freigeschaltet (Migration).'
        : error.message,
    }
  }
  const t = String(data?.token ?? token)
  return { ok: true, url: buildPortalEinladungUrl(t), token: t }
}

export function buildHausmeisterEinladungMailto(opts: {
  toEmail: string
  link: string
  hvName: string
  objektLabel: string
  hmName: string
}): string {
  const subj = encodeURIComponent(`Portal-Zugang Hausmeister — ${opts.objektLabel}`)
  const body = encodeURIComponent(
    [
      `Guten Tag ${opts.hmName},`,
      '',
      `hiermit laden wir Sie ein, Ihr Hausmeister-Konto für ${opts.objektLabel} anzulegen.`,
      '',
      'Im Portal sehen Sie die Vorgänge Ihrer Objekte und können Hausmeister-Prüfungen (Checklisten) durchführen.',
      '',
      'Bitte nutzen Sie diesen persönlichen Link:',
      opts.link,
      '',
      'Viele Grüße',
      opts.hvName,
    ].join('\n')
  )
  return `mailto:${encodeURIComponent(opts.toEmail.trim())}?subject=${subj}&body=${body}`
}
