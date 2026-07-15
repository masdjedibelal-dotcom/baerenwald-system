import type { Metadata } from 'next'
import { ensureStandardFormularTemplates, loadFormularTemplates } from '@/app/(dashboard)/formulare/actions'
import { FormulareListeClient } from '@/components/formulare/FormulareListeClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'

export const metadata: Metadata = {
  title: 'Formulare',
}

export default async function EinstellungenFormularePage() {
  await ensureStandardFormularTemplates()
  const templates = await loadFormularTemplates()

  return (
    <div>
      <EinstellungenMeta className="mb-4">Vorlagen für Handwerker- und Betreuer-Formulare im Projekt.</EinstellungenMeta>
      <FormulareListeClient templates={templates} />
    </div>
  )
}
