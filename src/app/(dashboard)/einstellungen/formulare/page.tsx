import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { ensureStandardFormularTemplates, loadFormularTemplates } from '@/app/(dashboard)/formulare/actions'
import { FormulareListeClient } from '@/components/formulare/FormulareListeClient'

export const metadata: Metadata = {
  title: 'Formulare',
}

export default async function EinstellungenFormularePage() {
  await ensureStandardFormularTemplates()
  const templates = await loadFormularTemplates()

  return (
    <div>
      <PageHeader description="Vorlagen für Handwerker- und Betreuer-Formulare im Projekt." />
      <FormulareListeClient templates={templates} />
    </div>
  )
}
