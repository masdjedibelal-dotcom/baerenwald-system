'use client'

import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LinkChevron } from '@/components/ui/LinkChevron'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import { formatDatum } from '@/lib/utils'
import type { AuftragListeEintrag } from '@/lib/types'

function kundenName(a: AuftragListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

export function DashboardAuftraegeImLauf({ auftraege }: { auftraege: AuftragListeEintrag[] }) {
  const pager = useDashboardListPage(auftraege)

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Aktive Aufträge
        </span>
      }
      action={
        <Link href="/auftraege" className="text-xs font-medium text-bw-link hover:underline">
          <LinkChevron>Alle</LinkChevron>
        </Link>
      }
      bodyClassName="p-0"
    >
      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Keine aktiven Aufträge.</p>
      ) : (
        <>
          <DashboardCardScrollList tall>
            {pager.pageItems.map((a) => {
              const titel = a.titel?.trim() || kundenName(a)
              const pct = a.fortschritt ?? 0
              return (
                <AppEntityListRow
                  key={a.id}
                  href={`/auftraege/${a.id}`}
                  avatar={<ListAvatar name={kundenName(a)} size="sm" />}
                  title={kundenName(a)}
                  line2={titel}
                  line3={
                    a.end_datum ? (
                      <span className="inline-flex items-center gap-2">
                        <AuftragStatusBadge status={a.status} />
                        <span>bis {formatDatum(a.end_datum)}</span>
                      </span>
                    ) : (
                      <AuftragStatusBadge status={a.status} />
                    )
                  }
                  badge={
                    <span className="text-xs font-medium tabular-nums text-bw-text-muted">{pct}%</span>
                  }
                  footer={<ProgressBar value={pct} />}
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
