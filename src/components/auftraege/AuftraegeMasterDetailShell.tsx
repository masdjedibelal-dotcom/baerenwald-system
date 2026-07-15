'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { AuftraegeListeClient } from '@/components/auftraege/AuftraegeListeClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
import { auftragIdFromPath, auftraegeFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
import type { AuftragListeEintrag } from '@/lib/types'
import type { AuftragPipelineKontext } from '@/lib/crm/projekt-pipeline'

export function AuftraegeMasterDetailShell({
  auftraege,
  pipelineKontextByAuftragId = {},
  children,
}: {
  auftraege: AuftragListeEintrag[]
  pipelineKontextByAuftragId?: Record<string, AuftragPipelineKontext>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const selectedId = auftragIdFromPath(pathname)
  const fullBleed = auftraegeFullBleedSubRoute(pathname)

  return (
    <AppMasterDetailLayout
      basePath="/auftraege"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Aufträge werden geladen…
            </div>
          }
        >
          <AuftraegeListeClient
            auftraege={auftraege}
            pipelineKontextByAuftragId={pipelineKontextByAuftragId}
            mode="page"
          />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
