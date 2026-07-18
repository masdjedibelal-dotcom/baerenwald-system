import type { Metadata } from 'next'
import { ensureStandardFormularTemplates, loadFormularTemplates } from '@/app/(dashboard)/formulare/actions'
import { FormulareListeClient } from '@/components/formulare/FormulareListeClient'

export const metadata: Metadata = {
  title: 'Formulare',
}

export default async function EinstellungenFormularePage() {
  await ensureStandardFormularTemplates()
  const templates = await loadFormularTemplates()
  return <FormulareListeClient templates={templates} />
}
