import type { Metadata } from 'next'
import {
  ensureStandardFormularTemplates,
  loadFormularTemplatesMitNutzung,
} from '@/app/(dashboard)/formulare/actions'
import { FormulareListeClient } from '@/components/formulare/FormulareListeClient'

export const metadata: Metadata = {
  title: 'Formulare',
}

export default async function EinstellungenFormularePage() {
  await ensureStandardFormularTemplates()
  const templates = await loadFormularTemplatesMitNutzung()
  return <FormulareListeClient templates={templates} />
}
