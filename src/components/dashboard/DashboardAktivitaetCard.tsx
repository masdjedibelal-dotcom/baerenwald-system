'use client'

import { Activity } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import type { DashboardAktivitaetEintrag } from '@/lib/dashboard-aktivitaet'

export function DashboardAktivitaetCard({ items }: { items: DashboardAktivitaetEintrag[] }) {
  const pager = useDashboardListPage(items)

  return (
    <Card
      collapsible={false}
      title={
        <span className="inline-flex items-center gap-2">
          <Activity className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Letzte Aktivitäten
        </span>
      }
      bodyClassName="p-0"
    >
      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Noch keine Aktivität.</p>
      ) : (
        <>
          <DashboardCardScrollList paginated>
            {pager.pageItems.map((item) => (
              <AppEntityListRow
                key={item.id}
                href={item.href}
                avatar={<ListAvatar name={item.titel} size="sm" tone="muted" />}
                title={item.titel}
                line2={item.untertitel}
                badge={
                  <span className="text-xs text-bw-text-muted">{item.typ}</span>
                }
              />
            ))}
          </DashboardCardScrollList>
          <DashboardCardPagination
            rangeFrom={pager.rangeFrom}
            rangeTo={pager.rangeTo}
            total={pager.total}
            pageIndex={pager.pageIndex}
            totalPages={pager.totalPages}
            onPrev={pager.goPrev}
            onNext={pager.goNext}
          />
        </>
      )}
    </Card>
  )
}
