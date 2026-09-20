import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { FormularTemplateForm } from '@/components/formulare/FormularTemplateForm'
import type { Gewerk } from '@/lib/types'

export default async function FormularNeuPage() {
  const supabase = createClient()
  const {data: gw, error} = await supabase.from('gewerke').select('id, name, slug, aktiv').order('name')
  if (error) logDbError('app/formulare/neu/page:gewerke', error)
  return <FormularTemplateForm initial={null} gewerke={(gw ?? []) as Gewerk[]} />
}
