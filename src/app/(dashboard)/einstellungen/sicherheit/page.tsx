import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { EinstellungenSicherheitClient } from '@/components/einstellungen/EinstellungenSicherheitClient'

export const metadata: Metadata = {
  title: 'Sicherheit & DSGVO',
}

export default function EinstellungenSicherheitPage() {
  return (
    <div>
      <PageHeader description="Datenschutz, Rollen und revisionssichere Aufbewahrung." />
      <EinstellungenSicherheitClient />
    </div>
  )
}
