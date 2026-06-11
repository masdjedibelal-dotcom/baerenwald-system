'use client'

import { Briefcase } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DashboardCardAlleLink } from '@/components/dashboard/DashboardCardAlleLink'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import type { AuftragListeEintrag } from '@/lib/types'

function kundenName(a: AuftragListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

function auftragSubline(a: AuftragListeEintrag) {
  return a.titel?.trim() || '—'
}

export function DashboardAuftraegeImLauf({ auftraege }: { auftraege: AuftragListeEintrag[] }) {
  const pager = useDashboardListPage(auftraege)

  return (
    <Card
      collapsible={false}
      title={
        <span className="inline-flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Aktive Aufträge
        </span>
      }
      action={<DashboardCardAlleLink href="/auftraege" />}
      bodyClassName="p-0"
    >
      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Keine aktiven Aufträge.</p>
      ) : (
        <>
          <DashboardCardScrollList paginated>
            {pager.pageItems.map((a) => (
              <AppEntityListRow
                key={a.id}
                href={`/auftraege/${a.id}`}
                avatar={<ListAvatar name={kundenName(a)} size="sm" />}
                title={kundenName(a)}
                line2={auftragSubline(a)}
                badge={<AuftragStatusBadge status={a.status} />}
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
