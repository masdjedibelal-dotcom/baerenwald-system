import { createClient } from '@/lib/supabase-server'
import { FormularTemplateForm } from '@/components/formulare/FormularTemplateForm'
import type { Gewerk } from '@/lib/types'

export default async function FormularNeuPage() {
  const supabase = createClient()
  const { data: gw } = await supabase.from('gewerke').select('id, name, slug, aktiv').order('name')
  return <FormularTemplateForm initial={null} gewerke={(gw ?? []) as Gewerk[]} />
}
