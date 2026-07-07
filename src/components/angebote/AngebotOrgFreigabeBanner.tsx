'use client'

import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ORG_FREIGABE_LABELS } from '@/lib/org/org-portal-helpers'
import type { OrgFreigabeLogRow, OrgFreigabeStatus } from '@/lib/types'
import { formatDatumZeit } from '@/lib/utils'

export function AngebotOrgFreigabeBanner({
  orgFreigabeStatus,
  orgFreigabeLog,
}: {
  orgFreigabeStatus?: OrgFreigabeStatus | null
  orgFreigabeLog?: OrgFreigabeLogRow[] | null
}) {
  const status = orgFreigabeStatus ?? 'nicht_noetig'
  if (status === 'nicht_noetig' && !(orgFreigabeLog?.length ?? 0)) return null

  const badgeStatus =
    status === 'freigegeben' || status === 'nicht_noetig'
      ? 'done'
      : status === 'ausstehend'
        ? 'offer'
        : status === 'abgelehnt'
          ? 'cancel'
          : 'order'

  return (
    <Card
      title={
        <>
          <ShieldAlert className="inline h-4 w-4 text-bw-primary" aria-hidden /> Org-Freigabe
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={badgeStatus} label={ORG_FREIGABE_LABELS[status]} />
        {status === 'ausstehend' ? (
          <span className="text-[12px] text-bw-text-muted">
            Partner- und Handwerker-Anfragen sind bis zur Freigabe blockiert.
          </span>
        ) : null}
      </div>
      {orgFreigabeLog && orgFreigabeLog.length > 0 ? (
        <ul className="mt-3 divide-y divide-bw-border border-t border-bw-border pt-2 text-[12px]">
          {orgFreigabeLog.slice(0, 5).map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-1.5">
              <span className="capitalize text-bw-text">{e.aktion}</span>
              <span className="shrink-0 text-bw-text-muted">{formatDatumZeit(e.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}
