'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { HandwerkerListeClient } from '@/components/handwerker/HandwerkerListeClient'
import {
  AppMasterDetailLayout,
  AppMasterDetailPlaceholder,
} from '@/components/layout/app/AppMasterDetailLayout'
import { handwerkerFullBleedSubRoute, handwerkerIdFromPath } from '@/lib/crm/master-detail-paths'
import type { GewerkOption, HandwerkerZeile } from '@/components/handwerker/HandwerkerListeClient'

export function HandwerkerMasterDetailShell({
  rows,
  gewerkeOptionen,
  children,
}: {
  rows: HandwerkerZeile[]
  gewerkeOptionen: GewerkOption[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = handwerkerIdFromPath(pathname)
  const fullBleed = handwerkerFullBleedSubRoute(pathname)
  const isListRoot = pathname === '/handwerker'

  return (
    <AppMasterDetailLayout
      basePath="/handwerker"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Handwerker werden geladen…
            </div>
          }
        >
          <HandwerkerListeClient
            rows={rows}
            gewerkeOptionen={gewerkeOptionen}
            mode="pane"
            selectedId={selectedId}
          />
        </Suspense>
      }
    >
      {isListRoot ? (
        <AppMasterDetailPlaceholder
          title="Handwerker auswählen"
          description="Wähle links einen Handwerker für Stammdaten, Aufträge und Compliance."
        />
      ) : (
        children
      )}
    </AppMasterDetailLayout>
  )
}
