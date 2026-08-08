'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { HandwerkerListeClient } from '@/components/handwerker/HandwerkerListeClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { handwerkerFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
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
  const fullBleed = handwerkerFullBleedSubRoute(pathname)

  return (
    <AppMasterDetailLayout
      basePath="/handwerker"
      fullBleed={fullBleed}
      list={
        <Suspense fallback={<CrmInlineLoading label="Partner werden geladen …" minHeight={120} />}>
          <HandwerkerListeClient rows={rows} gewerkeOptionen={gewerkeOptionen} />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
