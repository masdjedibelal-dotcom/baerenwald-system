import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { AngebotVorlagenListeClient } from '@/components/einstellungen/AngebotVorlagenListeClient'
import { listAngebotVorlagenEinstellungen } from '@/app/(dashboard)/angebote/actions'

export const metadata: Metadata = {
  title: 'Angebot-Vorlagen',
}

export default async function EinstellungenVorlagenPage() {
  const vorlagen = await listAngebotVorlagenEinstellungen()
  return (
    <div>
      <PageHeader
        title="Angebot-Vorlagen"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Angebot-Vorlagen' },
        ]}
        description="Wiederverwendbare Positionsstrukturen für neue Angebote."
      />
      <AngebotVorlagenListeClient vorlagen={vorlagen} />
    </div>
  )
}
