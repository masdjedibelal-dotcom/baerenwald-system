'use client'

import { useState } from 'react'
import { AnfrageSidePanel } from '@/components/anfragen/AnfrageSidePanel'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { BEREICH_LABELS, KANAL_ICONS, formatRelativeDate } from '@/lib/utils'
import type { LeadKanal, LeadStatus, LeadWithAngebote } from '@/lib/types'

function leadName(l: LeadWithAngebote) {
  const k = l.kunden
  if (k && 'name' in k && k.name) return k.name
  return l.kontakt_name ?? 'Ohne Namen'
}

export function DashboardAnfrageZeile({ anfrage }: { anfrage: LeadWithAngebote }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const kanal = anfrage.kanal as LeadKanal
  const icon = KANAL_ICONS[kanal] ?? '·'

  const bereiche =
    anfrage.bereiche?.slice(0, 2).map((b) => BEREICH_LABELS[b] ?? b).join(' · ') ?? ''
  const more =
    anfrage.bereiche && anfrage.bereiche.length > 2 ? ` +${anfrage.bereiche.length - 2}` : ''

  return (
    <>
      <button type="button" onClick={() => setPanelOpen(true)} className="list-row w-full text-left">
        <div className="md:hidden w-full">
          <div className="mb-0.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" aria-hidden>
                {icon}
              </span>
              <span className="text-sm font-medium text-bw-text">{leadName(anfrage)}</span>
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
          <span className="flex-shrink-0 text-base" aria-hidden>
            {icon}
          </span>
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{leadName(anfrage)}</span>
          <span className="w-32 truncate text-xs text-bw-text-muted">{bereiche}</span>
          <LeadStatusBadge status={anfrage.status as LeadStatus} />
          <span className="w-20 text-right text-xs text-bw-text-muted">
            {formatRelativeDate(anfrage.created_at)}
          </span>
        </div>
      </button>

      <AnfrageSidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        leadId={anfrage.id}
        summary={anfrage}
      />
    </>
  )
}
