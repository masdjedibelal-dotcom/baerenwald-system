'use server'

import { revalidateKundeDetail,revalidateKundeObjekt,revalidateLeadList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { OBJEKT_KONTAKT_ROLLEN } from '@/lib/objektakte/labels'
import type {
  ObjektKontakt,
  ObjektKontaktInput,
} from '@/lib/objektakte/types'

async function assertObjektGehoertKunde(kundeId: string, objektId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden_objekte')
    .select('id')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (error) logDbError('app/actions/objektakte-actions:kunden_objekte', error)
  return Boolean(data)
}

function validateKontaktInput(input: ObjektKontaktInput): string | null {
  const name = input.name?.trim()
  if (!name) return 'Name ist erforderlich.'
  if (!OBJEKT_KONTAKT_ROLLEN.includes(input.rolle)) return 'Ungültige Rolle.'
  return null
}

function revalidateObjektAkte(kundeId: string, objektId: string) {
  revalidateKundeDetail(kundeId)
  revalidateKundeObjekt(kundeId, objektId)
  revalidateLeadList()
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
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

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
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

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
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

/** Soft-Delete rückgängig (Undo-Toast). */
export async function restoreObjektKontakt(
  kundeId: string,
  objektId: string,
  kontaktId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('objekt_kontakte')
    .update({ aktiv: true, updated_at: new Date().toISOString() })
    .eq('id', kontaktId)
    .eq('kunde_id', kundeId)
    .eq('kunde_objekt_id', objektId)
  if (error) logDbError('app/actions/objektakte-actions:objekt_kontakte', error)

  if (error) return { ok: false, message: error.message }
  revalidateObjektAkte(kundeId, objektId)
  return { ok: true }
}

export type BewohnerPrivatkundeLink = {
  bewohnerId: string
  bewohnerName: string
  rolle: string | null
  einheitId: string
  einheitBezeichnung: string
  objektId: string
  objektTitel: string
  hvKundeId: string
  hvName: string
}

