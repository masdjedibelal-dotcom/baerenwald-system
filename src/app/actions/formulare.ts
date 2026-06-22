'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { FormularFeld, FormularTemplate } from '@/lib/types'

export async function saveFormularTemplate(
  data: {
    name: string
    subtyp: string | null
    phase: FormularTemplate['phase']
    typ: FormularTemplate['typ']
    gewerk_id?: string | null
    felder: FormularFeld[]
    aktiv: boolean
  },
  templateId?: string
): Promise<string> {
  const supabase = createClient()
  const payload = {
    name: data.name.trim(),
    subtyp: data.subtyp?.trim() || null,
    phase: data.phase,
    typ: data.typ,
    gewerk_id: data.gewerk_id ?? null,
    felder: data.felder as unknown[],
    aktiv: data.aktiv,
  }

  if (templateId) {
    const { error } = await supabase.from('formular_templates').update(payload).eq('id', templateId)
    if (error) throw new Error(error.message)
    revalidatePath('/formulare')
    revalidatePath(`/formulare/${templateId}/bearbeiten`)
    return templateId
  }

  const { data: row, error } = await supabase
    .from('formular_templates')
    .insert(payload)
    .select('id')
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Speichern fehlgeschlagen')
  const id = row.id as string
  revalidatePath('/formulare')
  revalidatePath(`/formulare/${id}/bearbeiten`)
  return id
}

export async function deleteFormularTemplate(templateId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('formular_templates')
    .update({ aktiv: false })
    .eq('id', templateId)

  if (error) throw new Error(error.message)
  revalidatePath('/formulare')
}
