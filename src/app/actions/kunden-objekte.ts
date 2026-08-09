'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { kundeHatOrgKennung } from '@/app/actions/kunden-organisation'
import { leadVertragsKundeId, resolveLeadKunde } from '@/lib/lead-display-helpers'
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

  if (error) {
    console.warn('fetchKundenObjekte:', error.message)
    return []
  }
  return (data ?? []) as KundenObjekt[]
}

export type KundenObjektListenStats = {
  einheitenTotal: number
  einheitenVermietet: number
}

/** Einheiten-/Vermietet-Zähler für Objekte-Liste (Mock-Spalten). */
export async function fetchKundenObjektListenStats(
  kundeId: string,
  objektIds: string[]
): Promise<Record<string, KundenObjektListenStats>> {
  const kid = kundeId?.trim()
  const ids = objektIds.map((x) => x.trim()).filter(Boolean)
  if (!kid || ids.length === 0) return {}

  const supabase = createClient()
  const { data: owned } = await supabase
    .from('kunden_objekte')
    .select('id')
    .eq('kunde_id', kid)
    .in('id', ids)
  const allowed = new Set((owned ?? []).map((r) => r.id as string))
  if (allowed.size === 0) return {}

  const { data: einheiten } = await supabase
    .from('objekt_einheiten')
    .select('id, kunde_objekt_id')
    .in('kunde_objekt_id', Array.from(allowed))
    .eq('aktiv', true)

  const units = einheiten ?? []
  const einheitIds = units.map((e) => e.id as string)
  let vermietetSet = new Set<string>()
  if (einheitIds.length > 0) {
    const { data: bewohner } = await supabase
      .from('einheit_bewohner')
      .select('objekt_einheit_id')
      .in('objekt_einheit_id', einheitIds)
      .eq('aktiv', true)
    vermietetSet = new Set(
      (bewohner ?? []).map((b) => b.objekt_einheit_id as string).filter(Boolean)
    )
  }

  const next: Record<string, KundenObjektListenStats> = {}
  for (const id of Array.from(allowed)) {
    const u = units.filter((e) => e.kunde_objekt_id === id)
    next[id] = {
      einheitenTotal: u.length,
      einheitenVermietet: u.filter((x) => vermietetSet.has(x.id as string)).length,
    }
  }
  return next
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

  if (error || !data) return { ok: false, message: error?.message ?? 'Objekt konnte nicht angelegt werden.' }

  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/anfragen')
  return { ok: true, objekt: data as KundenObjekt }
}

/** Nur Freigabe-Overrides (NULL = HV erben). */
export async function updateKundenObjektFreigabe(
  objektId: string,
  kundeId: string,
  input: {
    freigabe_schwelle_eur: number | null
    notfall_direkt: boolean | null
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
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('kunden_objekte')
    .update(payload)
    .eq('id', oid)
    .eq('kunde_id', kid)

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/kunden/${kid}`)
  revalidatePath(`/kunden/${kid}/objekte/${oid}`)
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

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/anfragen')
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

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath('/anfragen')
  return { ok: true }
}

export async function setLeadKundeObjekt(
  leadId: string,
  kundeObjektId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const objektId = kundeObjektId?.trim() || null

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select(
      'kunde_id, auftraggeber_kunde_id, kunden!kunde_id(id), auftraggeber:kunden!auftraggeber_kunde_id(id)'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !lead) {
    return { ok: false, message: leadErr?.message ?? 'Anfrage nicht gefunden.' }
  }

  const melder = resolveLeadKunde(lead.kunden as never)
  const agRaw = lead.auftraggeber as { id?: string } | { id?: string }[] | null
  const ag = Array.isArray(agRaw) ? agRaw[0] : agRaw
  const kundeId = leadVertragsKundeId({
    kunde_id: lead.kunde_id,
    auftraggeber_kunde_id: lead.auftraggeber_kunde_id,
    kunden: melder,
    auftraggeber: ag,
  })

  if (objektId) {
    if (!kundeId) {
      return { ok: false, message: 'Kein Kunde mit dieser Anfrage verknüpft.' }
    }
    const { data: objekt, error: objErr } = await supabase
      .from('kunden_objekte')
      .select('id, kunde_id')
      .eq('id', objektId)
      .maybeSingle()

    if (objErr || !objekt) {
      return { ok: false, message: objErr?.message ?? 'Objekt nicht gefunden.' }
    }
    if (objekt.kunde_id !== kundeId) {
      return {
        ok: false,
        message: 'Dieses Objekt gehört nicht zum Kunden dieser Anfrage.',
      }
    }
  }

  const { error } = await supabase
    .from('leads')
    .update({
      kunde_objekt_id: objektId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}
