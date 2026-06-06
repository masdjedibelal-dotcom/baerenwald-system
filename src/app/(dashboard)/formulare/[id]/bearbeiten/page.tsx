import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import { FormularTemplateForm } from '@/components/formulare/FormularTemplateForm'
import type { FormularTemplate, Gewerk } from '@/lib/types'

export default async function FormularBearbeitenPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [template, { data: gw }] = await Promise.all([
    loadFormularTemplate(params.id),
    supabase.from('gewerke').select('id, name, slug, aktiv').order('name'),
  ])

  if (!template) notFound()

  return <FormularTemplateForm initial={template as FormularTemplate} gewerke={(gw ?? []) as Gewerk[]} />
}
