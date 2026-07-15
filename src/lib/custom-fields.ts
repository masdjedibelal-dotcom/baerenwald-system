import { createClient } from '@/lib/supabase-server'

export type CustomFieldDefinition = {
  id: string
  objekt_typ: string
  label: string
  feld_typ: string
  optionen: unknown
  pflicht: boolean
  sort_order: number
  aktiv: boolean
  created_at: string
}

export type CustomFieldValueRow = {
  id: string
  definition_id: string
  objekt_id: string
  wert: string | null
  created_at: string
  updated_at: string
  custom_field_definitions?: CustomFieldDefinition | null
}

export async function getCustomFields(objektTyp: string): Promise<CustomFieldDefinition[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('objekt_typ', objektTyp)
    .eq('aktiv', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('getCustomFields', error.message)
    return []
  }
  return (data ?? []) as CustomFieldDefinition[]
}

export async function getCustomValues(objektId: string): Promise<CustomFieldValueRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*, custom_field_definitions(*)')
    .eq('objekt_id', objektId)

  if (error) {
    console.warn('getCustomValues', error.message)
    return []
  }
  return (data ?? []) as CustomFieldValueRow[]
}

export async function saveCustomValue(
  definitionId: string,
  objektId: string,
  wert: string
): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('custom_field_values').upsert(
    {
      definition_id: definitionId,
      objekt_id: objektId,
      wert,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'definition_id,objekt_id' }
  )

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
