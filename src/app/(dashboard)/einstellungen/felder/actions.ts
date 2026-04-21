'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { CustomFieldDefinition } from '@/lib/custom-fields'

export async function loadAllCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .order('objekt_typ', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('loadAllCustomFieldDefinitions', error.message)
    return []
  }
  return (data ?? []) as CustomFieldDefinition[]
}

export async function saveCustomFieldDefinition(input: {
  id?: string
  objekt_typ: string
  label: string
  feld_typ: string
  optionen: unknown
  pflicht: boolean
}): Promise<{ ok: true; id?: string } | { ok: false; message: string }> {
  const supabase = createClient()
  if (input.id) {
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({
        label: input.label.trim(),
        feld_typ: input.feld_typ,
        optionen: input.optionen,
        pflicht: input.pflicht,
      })
      .eq('id', input.id)
    if (error) return { ok: false, message: error.message }
  } else {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        objekt_typ: input.objekt_typ,
        label: input.label.trim(),
        feld_typ: input.feld_typ,
        optionen: input.optionen,
        pflicht: input.pflicht,
        sort_order: 999,
        aktiv: true,
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
    revalidatePath('/einstellungen/felder')
    return { ok: true, id: data.id as string }
  }
  revalidatePath('/einstellungen/felder')
  return { ok: true }
}

export async function softDeleteCustomField(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('custom_field_definitions').update({ aktiv: false }).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/felder')
  return { ok: true }
}

export async function reorderCustomFields(
  objektTyp: string,
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({ sort_order: i * 10 })
      .eq('id', orderedIds[i])
      .eq('objekt_typ', objektTyp)
    if (error) return { ok: false, message: error.message }
  }
  revalidatePath('/einstellungen/felder')
  return { ok: true }
}
