'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { PartnerNetzwerkClient } from '@/components/partner/PartnerNetzwerkClient'
import {
  AppMasterDetailLayout,
  AppMasterDetailPlaceholder,
} from '@/components/layout/app/AppMasterDetailLayout'
import { partnerIdFromPath, partnerFullBleedSubRoute } from '@/lib/crm/master-detail-paths'
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
  const selectedId = partnerIdFromPath(pathname)
  const fullBleed = partnerFullBleedSubRoute(pathname)
  const isListRoot = pathname === '/partner'

  return (
    <AppMasterDetailLayout
      basePath="/partner"
      selectedId={selectedId}
      fullBleed={fullBleed}
      list={
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
              Partner werden geladen…
            </div>
          }
        >
          <PartnerNetzwerkClient
            partners={partners}
            kategorien={kategorien}
            mode="pane"
            selectedId={selectedId}
          />
        </Suspense>
      }
    >
      {isListRoot ? (
        <AppMasterDetailPlaceholder
          title="Partner auswählen"
          description="Wähle links einen Partner oder Netzwerk-Eintrag für Kontakt und Notizen."
        />
      ) : (
        children
      )}
    </AppMasterDetailLayout>
  )
}
