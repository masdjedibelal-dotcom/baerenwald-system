'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { LinkChevron } from '@/components/ui/LinkChevron'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { betragAnzeige, resolveStatusEinfach } from '@/lib/angebot-einfach'
import type { AngebotListeEintrag } from '@/lib/types'

function kundenName(a: AngebotListeEintrag) {
  const k = a.kunden
  if (k && typeof k === 'object' && 'name' in k && k.name) return String(k.name)
  return 'Ohne Kunde'
}

export function DashboardLetzteAngeboteCard({ angebote }: { angebote: AngebotListeEintrag[] }) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Letzte Angebote
        </span>
      }
      action={
        <Link href="/angebote" className="text-xs font-medium text-bw-link hover:underline">
          <LinkChevron>Alle</LinkChevron>
        </Link>
      }
      bodyClassName="p-0"
    >
      {angebote.length === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Keine Angebote.</p>
      ) : (
        <DashboardCardScrollList>
          {angebote.map((a) => {
            const name = kundenName(a)
            return (
              <AppEntityListRow
                key={a.id}
                href={`/angebote/${a.id}`}
                avatar={<ListAvatar name={name} size="sm" />}
                title={name}
                line2={betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
                badge={<AngebotEinfachStatusBadge status={resolveStatusEinfach(a)} />}
              />
            )
          })}
        </DashboardCardScrollList>
      )}
    </Card>
  )
}
