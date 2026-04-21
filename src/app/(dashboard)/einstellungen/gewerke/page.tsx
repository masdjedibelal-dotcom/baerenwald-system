import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { GewerkeEinstellungenClient } from '@/components/einstellungen/GewerkeEinstellungenClient'
import { loadGewerkeEinstellungen } from '@/app/(dashboard)/einstellungen/gewerke/actions'

export const metadata: Metadata = {
  title: 'Gewerke',
}

export default async function EinstellungenGewerkePage() {
  const initial = await loadGewerkeEinstellungen()
  return (
    <div>
      <PageHeader
        title="Gewerke"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Gewerke' },
        ]}
        description="Reihenfolge, Aktiv-Status und Zuordnung zur Preisliste."
      />
      <GewerkeEinstellungenClient initial={initial} />
    </div>
  )
}
