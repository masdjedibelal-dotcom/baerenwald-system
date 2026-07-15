'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { AnfragenListeClient } from '@/components/anfragen/AnfragenListeClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
import {
  anfrageIdFromPath,
  anfragenFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'
import type { LeadWithAngebote } from '@/lib/types'

export function AnfragenMasterDetailShell({
  leads,
  children,
}: {
  leads: LeadWithAngebote[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = anfrageIdFromPath(pathname)
  const fullBleed = anfragenFullBleedSubRoute(pathname)

  return (
    <AppMasterDetailLayout
      basePath="/anfragen"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Anfragen werden geladen…
            </div>
          }
        >
          <AnfragenListeClient leads={leads} mode="page" />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
