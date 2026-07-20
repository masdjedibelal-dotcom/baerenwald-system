'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { KundenListeClient } from '@/components/kunden/KundenListeClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
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
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Kunden werden geladen…
            </div>
          }
        >
          <KundenListeClient kunden={kunden} />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
