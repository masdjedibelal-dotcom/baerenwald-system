'use client'

import { useRouter } from 'next/navigation'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { KanalIcon } from '@/components/ui/KanalIcon'
import { BEREICH_LABELS, formatRelativeDate } from '@/lib/utils'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { LeadKanal, LeadStatus, LeadWithAngebote } from '@/lib/types'

export function DashboardAnfrageZeile({ anfrage }: { anfrage: LeadWithAngebote }) {
  const router = useRouter()
  const kanal = anfrage.kanal as LeadKanal

  const bereiche =
    anfrage.bereiche?.slice(0, 2).map((b) => BEREICH_LABELS[b] ?? b).join(' · ') ?? ''
  const more =
    anfrage.bereiche && anfrage.bereiche.length > 2 ? ` +${anfrage.bereiche.length - 2}` : ''

  return (
    <button
      type="button"
      onClick={() => router.push(`/anfragen/${anfrage.id}`)}
      className="list-row w-full text-left"
    >
        <div className="md:hidden w-full">
          <div className="mb-0.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <KanalIcon kanal={kanal} />
              <span className="text-sm font-medium text-bw-text">{leadKontaktAnzeigeName(anfrage)}</span>
            </div>
            <LeadStatusBadge status={anfrage.status as LeadStatus} />
          </div>
          <div className="text-xs text-bw-text-muted">
            {bereiche}
            {more}
            {(bereiche || more) && ' · '}
            {formatRelativeDate(anfrage.created_at)}
          </div>
        </div>

        <div className="hidden w-full items-center gap-4 md:flex">
          <KanalIcon kanal={kanal} />
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{leadKontaktAnzeigeName(anfrage)}</span>
          <span className="w-32 truncate text-xs text-bw-text-muted">{bereiche}</span>
          <LeadStatusBadge status={anfrage.status as LeadStatus} />
          <span className="w-20 text-right text-xs text-bw-text-muted">
            {formatRelativeDate(anfrage.created_at)}
          </span>
        </div>
    </button>
  )
}
