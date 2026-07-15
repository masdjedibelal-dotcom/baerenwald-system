'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { kundeHatOrgKennung } from '@/app/actions/kunden-organisation'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import {
  validateKundenObjektInput,
  type KundenObjektInput,
} from '@/lib/kunden-objekte'
import { normalizeOrgSlug } from '@/lib/org/slug'
import type { KundenObjekt } from '@/lib/types'

function objektDbPayload(input: KundenObjektInput): Record<string, unknown> {
  const slug = input.melde_slug?.trim() ? normalizeOrgSlug(input.melde_slug) : null
  return {
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

export async function createKundenObjekt(
  kundeId: string,
  input: KundenObjektInput
): Promise<{ ok: true; objekt: KundenObjekt } | { ok: false; message: string }> {
  const err = validateKundenObjektInput(input)
  if (err) return { ok: false, message: err }

  const hatKennung = await kundeHatOrgKennung(kundeId.trim())
  if (!hatKennung) {
    return {
      ok: false,
      message: 'Bitte zuerst eine Org-Kennung im Tab „Organisation“ hinterlegen.',
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
    .select('kunde_id, kunden!kunde_id(id)')
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !lead) {
    return { ok: false, message: leadErr?.message ?? 'Anfrage nicht gefunden.' }
  }

  const kundeId = resolveLeadKunde(lead.kunden as never)?.id?.trim() || lead.kunde_id?.trim() || null

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
