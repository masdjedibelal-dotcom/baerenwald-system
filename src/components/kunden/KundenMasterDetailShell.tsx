'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { KundenListeClient } from '@/components/kunden/KundenListeClient'
import {
  AppMasterDetailLayout,
  AppMasterDetailPlaceholder,
} from '@/components/layout/app/AppMasterDetailLayout'
import { kundeIdFromPath, kundenFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'

export function KundenMasterDetailShell({
  kunden,
  children,
}: {
  kunden: KundeListeZeile[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = kundeIdFromPath(pathname)
  const fullBleed = kundenFullBleedSubRoute(pathname)
  const isListRoot = pathname === '/kunden'

  return (
    <AppMasterDetailLayout
      basePath="/kunden"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Kunden werden geladen…
            </div>
          }
        >
          <KundenListeClient kunden={kunden} mode="pane" selectedId={selectedId} />
        </Suspense>
      }
    >
      {isListRoot ? (
        <AppMasterDetailPlaceholder
          title="Kunde auswählen"
          description="Wähle links einen Kunden für Stammdaten, Anfragen, Aufträge und Aktivität."
        />
      ) : (
        children
      )}
    </AppMasterDetailLayout>
  )
}
