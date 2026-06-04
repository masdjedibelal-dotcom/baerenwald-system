'use client'

import { useState } from 'react'
import { AngebotSidePanel } from '@/components/angebote/AngebotSidePanel'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { betragAnzeige, kundeNameAusAngebot } from '@/lib/angebot-einfach'
import { ANGEBOT_STATUS_LABELS, formatRelativeDate } from '@/lib/utils'
import type { AngebotListeEintrag } from '@/lib/types'

function kundenName(a: AngebotListeEintrag) {
  return kundeNameAusAngebot(a)
}

export function DashboardAngebotZeile({ angebot }: { angebot: AngebotListeEintrag }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="list-row w-full text-left">
        <div className="md:hidden w-full">
          <p className="text-sm font-medium text-bw-text">{kundenName(angebot)}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-bw-text">{betragAnzeige(angebot.gesamt_fix ?? null, angebot.gesamt_min, angebot.gesamt_max)}</span>
            <AngebotStatusBadge status={angebot.status} />
          </div>
          <p className="text-xs text-bw-text-muted">{formatRelativeDate(angebot.created_at)}</p>
        </div>
        <div className="hidden w-full items-center gap-4 md:flex">
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{kundenName(angebot)}</span>
          <span className="text-sm text-bw-text">{betragAnzeige(angebot.gesamt_fix ?? null, angebot.gesamt_min, angebot.gesamt_max)}</span>
          <AngebotStatusBadge status={angebot.status} />
          <span className="w-24 text-right text-xs text-bw-text-muted">
            {ANGEBOT_STATUS_LABELS[angebot.status] ?? angebot.status}
          </span>
          <span className="w-20 text-right text-xs text-bw-text-muted">
            {formatRelativeDate(angebot.created_at)}
          </span>
        </div>
      </button>

      <AngebotSidePanel open={open} onClose={() => setOpen(false)} angebotId={angebot.id} summary={angebot} />
    </>
  )
}
