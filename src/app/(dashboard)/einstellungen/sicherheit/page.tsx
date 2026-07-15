import type { Metadata } from 'next'
import { EinstellungenSicherheitClient } from '@/components/einstellungen/EinstellungenSicherheitClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'

export const metadata: Metadata = {
  title: 'Sicherheit & DSGVO',
}

export default function EinstellungenSicherheitPage() {
  return (
    <div>
      <EinstellungenMeta className="mb-4">Datenschutz, Rollen und revisionssichere Aufbewahrung.</EinstellungenMeta>
      <EinstellungenSicherheitClient />
    </div>
  )
}
