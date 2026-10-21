'use server'

import { revalidateKundeDetail,revalidateKundeObjekt,revalidateLeadList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { kundeHatOrgKennung } from '@/app/actions/kunden-organisation'
import {
validateKundenObjektInput,
type KundenObjektInput,
} from '@/lib/kunden-objekte'
import { normalizeOrgSlug } from '@/lib/org/slug'
import type { KundenObjekt } from '@/lib/types'

function objektDbPayload(input: KundenObjektInput): Record<string, unknown> {
  const slug = input.melde_slug?.trim() ? normalizeOrgSlug(input.melde_slug) : null
  const payload: Record<string, unknown> = {
    titel: input.titel.trim(),
    strasse: input.strasse?.trim() || null,
    hausnummer: input.hausnummer?.trim() || null,
    plz: input.plz?.trim() || null,
    ort: input.ort?.trim() || null,
    melde_slug: slug,
    melde_aktiv: input.melde_aktiv !== false,
    einheiten_hinweis: input.einheiten_hinweis?.trim() || null,
    notizen_intern: input.notizen_intern?.trim() || null,
  }
  if (input.freigabe_schwelle_eur !== undefined) {
    payload.freigabe_schwelle_eur =
      input.freigabe_schwelle_eur != null && Number.isFinite(Number(input.freigabe_schwelle_eur))
        ? Number(input.freigabe_schwelle_eur)
        : null
  }
  if (input.notfall_direkt !== undefined) {
    payload.notfall_direkt = input.notfall_direkt
  }
  return payload
}

export async function fetchKundenObjekte(kundeId: string): Promise<KundenObjekt[]> {
  const id = kundeId?.trim()
  if (!id) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .select('*')
    .eq('kunde_id', id)
    .order('titel', { ascending: true })
  if (error) logDbError('app/actions/kunden-objekte:kunden_objekte', error)

  if (error) {
    console.warn('fetchKundenObjekte:', error.message)
    return []
  }
  return (data ?? []) as KundenObjekt[]
}

export async function createKundenObjekt(
  kundeId: string,
  input: KundenObjektInput
): Promise<{ ok: true; objekt: KundenObjekt } | { ok: false; message: string }> {
  const err = validateKundenObjektInput(input)
  if (err) return { ok: false, message: err }

  const wantsMelde = Boolean(input.melde_slug?.trim())
  if (wantsMelde) {
    const hatKennung = await kundeHatOrgKennung(kundeId.trim())
    if (!hatKennung) {
      return {
        ok: false,
        message: 'Bitte zuerst eine Org-Kennung unter Organisation hinterlegen.',
      }
    }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .insert({
      kunde_id: kundeId.trim(),
      created_by: 'crm',
      ...objektDbPayload(input),
    })
    .select('*')
    .single()
  if (error) logDbError('app/actions/kunden-objekte:kunden_objekte', error)

  if (error || !data) return { ok: false, message: error?.message ?? 'Objekt konnte nicht angelegt werden.' }

  revalidateKundeDetail(kundeId)
  revalidateLeadList()
  return { ok: true, objekt: data as KundenObjekt }
}

/** Nur Freigabe-Overrides (NULL = HV erben). */
export async function updateKundenObjektFreigabe(
  objektId: string,
  kundeId: string,
  input: {
    freigabe_schwelle_eur: number | null
    notfall_direkt: boolean | null
    /** null = von der HV übernehmen */
    akut_fall_ids?: string[] | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const oid = objektId?.trim()
  const kid = kundeId?.trim()
  if (!oid || !kid) return { ok: false, message: 'Objekt oder Kunde fehlt.' }

  const schwelle =
    input.freigabe_schwelle_eur != null && Number.isFinite(Number(input.freigabe_schwelle_eur))
      ? Number(input.freigabe_schwelle_eur)
      : null
  const payload = {
    freigabe_schwelle_eur: schwelle != null && schwelle > 0 ? schwelle : null,
    notfall_direkt: input.notfall_direkt,
    ...(input.akut_fall_ids !== undefined ? { akut_fall_ids: input.akut_fall_ids } : {}),
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('kunden_objekte')
    .update(payload)
    .eq('id', oid)
    .eq('kunde_id', kid)
  if (error) logDbError('app/actions/kunden-objekte:kunden_objekte', error)

  if (error) return { ok: false, message: error.message }

  revalidateKundeDetail(kid)
  revalidateKundeObjekt(kid, oid)
  return { ok: true }
}

export async function updateKundenObjekt(
  objektId: string,
  kundeId: string,
  input: KundenObjektInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const err = validateKundenObjektInput(input)
  if (err) return { ok: false, message: err }

  const supabase = createClient()
  const { error } = await supabase
    .from('kunden_objekte')
    .update({
      ...objektDbPayload(input),
      updated_at: new Date().toISOString(),
    })
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
  if (error) logDbError('app/actions/kunden-objekte:kunden_objekte', error)

  if (error) return { ok: false, message: error.message }

  revalidateKundeDetail(kundeId)
  revalidateLeadList()
  return { ok: true }
}

export async function deleteKundenObjekt(
  objektId: string,
  kundeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('kunden_objekte')
    .delete()
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
  if (error) logDbError('app/actions/kunden-objekte:kunden_objekte', error)

  if (error) return { ok: false, message: error.message }

  revalidateKundeDetail(kundeId)
  revalidateLeadList()
  return { ok: true }
}
