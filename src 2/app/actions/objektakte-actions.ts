'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { OBJEKT_KONTAKT_ROLLEN } from '@/lib/objektakte/labels'
import type {
  EinheitBewohner,
  EinheitBewohnerInput,
  ObjektKontakt,
  ObjektKontaktInput,
  ObjektKontaktRolle,
} from '@/lib/objektakte/types'

async function assertObjektGehoertKunde(kundeId: string, objektId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('kunden_objekte')
    .select('id')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  return Boolean(data)
}

async function assertEinheitGehoertObjekt(
  kundeId: string,
  objektId: string,
  einheitId: string
): Promise<boolean> {
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) return false
  const supabase = createClient()
  const { data } = await supabase
    .from('objekt_einheiten')
    .select('id')
    .eq('id', einheitId)
    .eq('kunde_objekt_id', objektId)
    .maybeSingle()
  return Boolean(data)
}

function validateKontaktInput(input: ObjektKontaktInput): string | null {
  const name = input.name?.trim()
  if (!name) return 'Name ist erforderlich.'
  if (!OBJEKT_KONTAKT_ROLLEN.includes(input.rolle)) return 'Ungültige Rolle.'
  return null
}

function validateBewohnerInput(input: EinheitBewohnerInput): string | null {
  if (!input.objekt_einheit_id?.trim()) return 'Einheit ist erforderlich.'
  if (!input.name?.trim()) return 'Name ist erforderlich.'
  return null
}

function revalidateObjektAkte(kundeId: string, objektId: string) {
  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath(`/kunden/${kundeId}/objekte/${objektId}`)
  revalidatePath('/anfragen')
}

export async function createObjektKontakt(
  kundeId: string,
  objektId: string,
  input: ObjektKontaktInput
): Promise<{ ok: true; kontakt: ObjektKontakt } | { ok: false; message: string }> {
  const err = validateKontaktInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertObjektGehoertKunde(kundeId, objektId))) {
    return { ok: false, message: 'Objekt nicht gefunden.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('objekt_kontakte')
    .insert({
      kunde_id: kundeId,
      kunde_objekt_id: objektId,
      rolle: input.rolle,
      name: input.name.trim(),
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
      notiz: input.notiz?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Kontakt konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, kontakt: data as ObjektKontakt }
}

export async function updateObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string,
  input: Partial<ObjektKontaktInput>
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.rolle && !OBJEKT_KONTAKT_ROLLEN.includes(input.rolle)) {
    return { ok: false, message: 'Ungültige Rolle.' }
  }
  if (input.name != null && !input.name.trim()) {
    return { ok: false, message: 'Name ist erforderlich.' }
  }

  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name != null) patch.name = input.name.trim()
  if (input.rolle != null) patch.rolle = input.rolle
  if (input.telefon != null) patch.telefon = input.telefon.trim() || null
  if (input.email != null) patch.email = input.email.trim() || null
  if (input.notiz != null) patch.notiz = input.notiz.trim() || null

  const { error } = await supabase
    .from('objekt_kontakte')
    .update(patch)
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function deleteObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('objekt_kontakte')
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function createEinheitBewohner(
  kundeId: string,
  objektId: string,
  input: EinheitBewohnerInput
): Promise<{ ok: true; bewohner: EinheitBewohner } | { ok: false; message: string }> {
  const err = validateBewohnerInput(input)
  if (err) return { ok: false, message: err }
  if (!(await assertEinheitGehoertObjekt(kundeId, objektId, input.objekt_einheit_id))) {
    return { ok: false, message: 'Einheit nicht gefunden.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('einheit_bewohner')
    .insert({
      kunde_id: kundeId,
      objekt_einheit_id: input.objekt_einheit_id.trim(),
      name: input.name.trim(),
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select('*, objekt_einheiten(bezeichnung)')
    .single()

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Bewohner konnte nicht angelegt werden.' }
  }

  revalidateObjektAkte(kundeId, objektId)
  return { ok: true, bewohner: data as EinheitBewohner }
}

export async function updateEinheitBewohner(
  kundeId: string,
  objektId: string,
  bewohnerId: string,
  input: Partial<Pick<EinheitBewohnerInput, 'name' | 'telefon' | 'email'>>
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.name != null && !input.name.trim()) {
    return { ok: false, message: 'Name ist erforderlich.' }
  }

  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name != null) patch.name = input.name.trim()
  if (input.telefon != null) patch.telefon = input.telefon.trim() || null
  if (input.email != null) patch.email = input.email.trim() || null

  const { error } = await supabase
    .from('einheit_bewohner')
    .update(patch)
    .eq('id', bewohnerId)
    .eq('kunde_id', kundeId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export async function deleteEinheitBewohner(
  kundeId: string,
  objektId: string,
  bewohnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('einheit_bewohner')
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq('id', bewohnerId)
    .eq('kunde_id', kundeId)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}
