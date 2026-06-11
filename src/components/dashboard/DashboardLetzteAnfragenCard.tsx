'use client'

import { Inbox } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { DashboardCardAlleLink } from '@/components/dashboard/DashboardCardAlleLink'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { LeadStatus, LeadWithAngebote } from '@/lib/types'

function leadSubline(l: LeadWithAngebote) {
  const projekt = l.situation?.trim()
  const plz = l.plz?.trim() || '—'
  return projekt ? `${projekt} · ${plz}` : plz
}

export function DashboardLetzteAnfragenCard({ anfragen }: { anfragen: LeadWithAngebote[] }) {
  const pager = useDashboardListPage(anfragen)

  return (
    <Card
      collapsible={false}
      title={
        <span className="inline-flex items-center gap-2">
          <Inbox className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Letzte Anfragen
        </span>
      }
      action={<DashboardCardAlleLink href="/anfragen" />}
      bodyClassName="p-0"
    >
      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Noch keine Anfragen.</p>
      ) : (
        <>
          <DashboardCardScrollList paginated>
            {pager.pageItems.map((lead) => (
              <AppEntityListRow
                key={lead.id}
                href={`/anfragen/${lead.id}`}
                avatar={<ListAvatar name={leadKontaktAnzeigeName(lead)} size="sm" />}
                title={leadKontaktAnzeigeName(lead)}
                line2={leadSubline(lead)}
                badge={<LeadStatusBadge status={lead.status as LeadStatus} />}
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
