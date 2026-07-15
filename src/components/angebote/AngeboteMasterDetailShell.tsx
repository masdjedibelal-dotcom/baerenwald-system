'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { AngeboteListeClient } from '@/components/angebote/AngeboteListeClient'
import {
  AppMasterDetailLayout,
  AppMasterDetailPlaceholder,
} from '@/components/layout/app/AppMasterDetailLayout'
import { angebotIdFromPath, angeboteFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
import type { AngebotListeEintrag } from '@/lib/types'

export function AngeboteMasterDetailShell({
  angebote,
  angebotIdsMitAuftrag,
  angebotIdsMitRechnung = [],
  children,
}: {
  angebote: AngebotListeEintrag[]
  angebotIdsMitAuftrag: string[]
  angebotIdsMitRechnung?: string[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = angebotIdFromPath(pathname)
  const fullBleed = angeboteFullBleedSubRoute(pathname)
  const isListRoot = pathname === '/angebote'

  return (
    <AppMasterDetailLayout
      basePath="/angebote"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Angebote werden geladen…
            </div>
          }
        >
          <AngeboteListeClient
            angebote={angebote}
            angebotIdsMitAuftrag={angebotIdsMitAuftrag}
            angebotIdsMitRechnung={angebotIdsMitRechnung}
            mode="pane"
            selectedId={selectedId}
          />
        </Suspense>
      }
    >
      {isListRoot ? (
        <AppMasterDetailPlaceholder
          title="Angebot auswählen"
          description="Wähle links ein Angebot für Details, Positionen und Versand."
        />
      ) : (
        children
      )}
    </AppMasterDetailLayout>
  )
}
