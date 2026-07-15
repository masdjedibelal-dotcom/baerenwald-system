import type { Metadata } from 'next'
import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
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
    <div className="space-y-8">
      <EinstellungenMeta className="mb-4">Gewerke, zentrale Preisliste und Angebots-Vorlagen.</EinstellungenMeta>

      <section>
        <EinstellungenSectionHeading className="mb-3">Gewerke</EinstellungenSectionHeading>
        <GewerkeEinstellungenClient initial={gewerke} />
      </section>

      <MockCard title="Zentrale Preisliste">
        <p className="mt-1 text-sm text-bw-text-muted">
          Leistungen und Preise je Gewerk pflegen Sie in der dedizierten Preislisten-Ansicht.
        </p>
        <Link href="/preislisten" className="btn btn-primary btn-sm mt-4 inline-flex">
          Zur Preisliste →
        </Link>
      </MockCard>

      <section>
        <AngebotVorlagenListeClient vorlagen={vorlagen} />
      </section>
    </div>
  )
}
