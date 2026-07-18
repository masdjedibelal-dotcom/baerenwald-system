import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import { GewerkeEinstellungenClient } from '@/components/einstellungen/GewerkeEinstellungenClient'
import { AngebotVorlagenListeClient } from '@/components/einstellungen/AngebotVorlagenListeClient'
import { loadGewerkeEinstellungen } from '@/app/(dashboard)/einstellungen/gewerke/actions'
import { listAngebotVorlagenEinstellungen } from '@/app/(dashboard)/angebote/actions'

export const metadata: Metadata = {
  title: 'Preislisten',
}

export default async function EinstellungenPreisePage() {
  const [gewerke, vorlagen] = await Promise.all([
    loadGewerkeEinstellungen(),
    listAngebotVorlagenEinstellungen(),
  ])

  return (
    <div className="space-y-6">
      <section>
        <EinstellungenSectionHeading className="mb-3">Gewerke</EinstellungenSectionHeading>
        <GewerkeEinstellungenClient initial={gewerke} />
      </section>

      <Card title="Zentrale Preisliste">
        <p className="mt-1 text-sm text-bw-text-muted">
          Leistungen und Preise je Gewerk in der Preislisten-Ansicht pflegen.
        </p>
        <Link href="/preislisten" className="btn primary sm mt-4 inline-flex">
          Zur Preisliste →
        </Link>
      </Card>

      <section>
        <AngebotVorlagenListeClient vorlagen={vorlagen} />
      </section>
    </div>
  )
}
