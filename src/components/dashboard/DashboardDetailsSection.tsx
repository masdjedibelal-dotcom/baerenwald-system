'use client'

import { DashboardAktivitaetCard } from '@/components/dashboard/DashboardAktivitaetCard'
import { DashboardAuftraegeImLauf } from '@/components/dashboard/DashboardAuftraegeImLauf'
import { DashboardLetzteAnfragenCard } from '@/components/dashboard/DashboardLetzteAnfragenCard'
import { DashboardOffeneAngeboteCard } from '@/components/dashboard/DashboardOffeneAngeboteCard'
import { Tabs } from '@/components/ui/Tabs'
import type { DashboardAktivitaetEintrag } from '@/lib/dashboard-aktivitaet'
import type { AngebotListeEintrag, AuftragListeEintrag, LeadWithAngebote } from '@/lib/types'

type Props = {
  anfragen: LeadWithAngebote[]
  angebote: AngebotListeEintrag[]
  auftraege: AuftragListeEintrag[]
  aktivitaet: DashboardAktivitaetEintrag[]
}

export function DashboardDetailsSection({ anfragen, angebote, auftraege, aktivitaet }: Props) {
  return (
    <section className="space-y-2" aria-label="Details">
      <h2 className="text-sm font-semibold text-bw-text">Details</h2>

      <div className="lg:hidden">
        <Tabs
          tabs={[
            { id: 'aktivitaet', label: 'Aktivitäten', count: aktivitaet.length },
            { id: 'anfragen', label: 'Anfragen', count: anfragen.length },
            { id: 'angebote', label: 'Angebote', count: angebote.length },
            { id: 'auftraege', label: 'Aufträge', count: auftraege.length },
          ]}
          defaultTab="aktivitaet"
        >
          <DashboardAktivitaetCard items={aktivitaet} />
          <DashboardLetzteAnfragenCard anfragen={anfragen} />
          <DashboardOffeneAngeboteCard angebote={angebote} />
          <DashboardAuftraegeImLauf auftraege={auftraege} />
        </Tabs>
      </div>

      <div className="hidden lg:grid dashboard-grid-2">
        <DashboardAktivitaetCard items={aktivitaet} />
        <DashboardLetzteAnfragenCard anfragen={anfragen} />
        <DashboardOffeneAngeboteCard angebote={angebote} />
        <DashboardAuftraegeImLauf auftraege={auftraege} />
      </div>
    </section>
  )
}
