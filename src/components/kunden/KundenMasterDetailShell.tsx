'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { KundenListeClient } from '@/components/kunden/KundenListeClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { kundenFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'

export function KundenMasterDetailShell({
  kunden,
  children,
}: {
  kunden: KundeListeZeile[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const fullBleed = kundenFullBleedSubRoute(pathname)

  return (
    <AppMasterDetailLayout
      basePath="/kunden"
      fullBleed={fullBleed}
      list={
        <Suspense fallback={<CrmInlineLoading label="Kunden werden geladen …" minHeight={120} />}>
          <KundenListeClient kunden={kunden} />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
