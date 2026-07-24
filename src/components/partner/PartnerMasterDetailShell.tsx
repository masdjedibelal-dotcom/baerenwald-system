'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { PartnerNetzwerkClient } from '@/components/partner/PartnerNetzwerkClient'
import { AppMasterDetailLayout } from '@/components/layout/app/AppMasterDetailLayout'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { partnerFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
import type { PartnerKategorie, PartnerRow } from '@/components/partner/PartnerNetzwerkClient'

export function PartnerMasterDetailShell({
  partners,
  kategorien,
  children,
}: {
  partners: PartnerRow[]
  kategorien: PartnerKategorie[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const fullBleed = partnerFullBleedSubRoute(pathname)

  return (
    <AppMasterDetailLayout
      basePath="/partner"
      fullBleed={fullBleed}
      list={
        <Suspense fallback={<CrmInlineLoading label="Netzwerk wird geladen …" minHeight={120} />}>
          <PartnerNetzwerkClient partners={partners} kategorien={kategorien} />
        </Suspense>
      }
    >
      {children}
    </AppMasterDetailLayout>
  )
}
