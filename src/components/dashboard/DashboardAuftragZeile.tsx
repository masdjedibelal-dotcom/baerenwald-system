'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SidePanel } from '@/components/ui/SidePanel'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatDatum, formatPreis, AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import type { AuftragListeEintrag } from '@/lib/types'

function kundenName(a: AuftragListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

function handwerkerNamen(a: AuftragListeEintrag) {
  const names = (a.auftrag_handwerker ?? [])
    .map((z) => z.handwerker?.name)
    .filter(Boolean) as string[]
  return names.length ? names.join(', ') : '—'
}

export function DashboardAuftragZeile({ auftrag }: { auftrag: AuftragListeEintrag }) {
  const [open, setOpen] = useState(false)
  const titel = auftrag.titel?.trim() || kundenName(auftrag)
  const pct = auftrag.fortschritt ?? 0

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="list-row w-full flex-col items-stretch gap-2 !items-stretch md:flex-row md:items-center">
        <div className="md:hidden w-full">
          <p className="text-sm font-medium text-bw-text">
            {kundenName(auftrag)} · {titel}
          </p>
          <div className="mt-2 max-w-md">
            <ProgressBar value={pct} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-bw-text-muted">{pct}%</span>
            <AuftragStatusBadge status={auftrag.status} />
          </div>
          <p className="mt-1 text-xs text-bw-text-muted">
            {auftrag.end_datum ? `Fertig: ${formatDatum(auftrag.end_datum)}` : '—'}
          </p>
        </div>
        <div className="hidden w-full items-center gap-4 md:flex">
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{kundenName(auftrag)}</span>
          <div className="w-40">
            <ProgressBar value={pct} />
          </div>
          <AuftragStatusBadge status={auftrag.status} />
          <span className="w-24 text-right text-xs text-bw-text-muted">
            {auftrag.end_datum ? formatDatum(auftrag.end_datum) : '—'}
          </span>
        </div>
      </button>

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        title={kundenName(auftrag)}
        subtitle={auftrag.start_datum ? `Start: ${formatDatum(auftrag.start_datum)}` : undefined}
        badge={<AuftragStatusBadge status={auftrag.status} />}
      >
        <div className="space-y-4 p-5 text-sm">
          <p className="text-bw-text-muted">{handwerkerNamen(auftrag)}</p>
          {auftrag.angebote ? (
            <p>
              Angebot:{' '}
              {formatPreis(
                auftrag.angebote.gesamt_fix ?? null,
                auftrag.angebote.gesamt_min ?? null,
                auftrag.angebote.gesamt_max ?? null
              )}
            </p>
          ) : null}
          <p className="text-xs text-bw-text-muted">{AUFTRAG_STATUS_LABELS[auftrag.status]}</p>
          <Link
            href={`/auftraege/${auftrag.id}`}
            className="inline-block text-sm font-medium text-bw-link hover:underline"
            onClick={() => setOpen(false)}
          >
            Zum Auftrag
          </Link>
        </div>
      </SidePanel>
    </>
  )
}
