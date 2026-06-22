'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { RechnungenListeClient } from '@/components/rechnungen/RechnungenListeClient'
import {
  AppMasterDetailLayout,
  AppMasterDetailPlaceholder,
} from '@/components/layout/app/AppMasterDetailLayout'
import {
  rechnungIdFromPath,
  rechnungenFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'
import type { RechnungListeZeile } from '@/lib/types'

export function RechnungenMasterDetailShell({
  rows,
  children,
}: {
  rows: RechnungListeZeile[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = rechnungIdFromPath(pathname)
  const fullBleed = rechnungenFullBleedSubRoute(pathname)
  const isListRoot = pathname === '/rechnungen'

  return (
    <AppMasterDetailLayout
      basePath="/rechnungen"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Rechnungen werden geladen…
            </div>
          }
        >
          <RechnungenListeClient rows={rows} mode="pane" selectedId={selectedId} />
        </Suspense>
      }
    >
      {isListRoot ? (
        <AppMasterDetailPlaceholder
          title="Rechnung auswählen"
          description="Wähle links eine Rechnung für Details, PDF und Zahlungsstatus."
        />
      ) : (
        children
      )}
    </AppMasterDetailLayout>
  )
}
