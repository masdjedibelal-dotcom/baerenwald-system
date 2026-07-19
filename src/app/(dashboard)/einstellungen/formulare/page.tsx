import type { Metadata } from 'next'
import {
  ensureStandardFormularTemplates,
  loadFormularTemplatesMitNutzung,
} from '@/app/(dashboard)/formulare/actions'
import { FormulareListeClient } from '@/components/formulare/FormulareListeClient'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { createClient } from '@/lib/supabase-server'
import { buildDokumentPdfMusterListe } from '@/lib/templates/dokument-pdf-muster'

export const metadata: Metadata = {
  title: 'Formulare',
}

export default async function EinstellungenFormularePage() {
  await ensureStandardFormularTemplates()
  const supabase = createClient()
  const [templates, firm] = await Promise.all([
    loadFormularTemplatesMitNutzung(),
    fetchFirmenEinstellungen(supabase),
  ])
  const dokumentVorlagen = buildDokumentPdfMusterListe(firm)
  return (
    <FormulareListeClient templates={templates} dokumentVorlagen={dokumentVorlagen} />
  )
}
