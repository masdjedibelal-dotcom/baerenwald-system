'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import type { CustomFieldDefinition } from '@/lib/custom-fields'

export async function loadAllCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .order('objekt_typ', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) logDbError('app/einstellungen/felder/actions:custom_field_definitions', error)
  if (error) {
    console.warn('loadAllCustomFieldDefinitions', error.message)
    return []
  }
  return (data ?? []) as CustomFieldDefinition[]
}
