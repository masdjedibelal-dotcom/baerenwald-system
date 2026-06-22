'use client'

import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { DashboardCardAlleLink } from '@/components/dashboard/DashboardCardAlleLink'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import { angebotKundenName, angebotSubline } from '@/components/dashboard/dashboard-list-utils'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'
import type { AngebotListeEintrag } from '@/lib/types'

export function DashboardOffeneAngeboteCard({ angebote }: { angebote: AngebotListeEintrag[] }) {
  const pager = useDashboardListPage(angebote)

  return (
    <Card
      collapsible={false}
      title={
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Offene Angebote
        </span>
      }
      action={<DashboardCardAlleLink href="/angebote" />}
      bodyClassName="p-0"
    >
      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Keine Angebote.</p>
      ) : (
        <>
          <DashboardCardScrollList paginated>
            {pager.pageItems.map((a) => {
              const name = angebotKundenName(a)
              return (
                <AppEntityListRow
                  key={a.id}
                  href={`/angebote/${a.id}`}
                  avatar={<ListAvatar name={name} size="sm" />}
                  title={name}
                  line2={angebotSubline(a)}
                  badge={<AngebotEinfachStatusBadge status={resolveStatusEinfach(a)} />}
                />
              )
            })}
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
