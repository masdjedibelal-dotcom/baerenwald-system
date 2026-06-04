'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ArrowDownLeft, ArrowUpRight, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import {
  loadKommunikationListe,
  type KommunikationFilter,
} from '@/app/(dashboard)/kommunikation/actions'
import {
  freitextMailTypLabel,
  type KommunikationListeZeile,
} from '@/lib/kommunikation/types'
import { formatDatumZeit } from '@/lib/utils'

export function KommunikationCard({
  filter,
  reloadKey = 0,
  className,
}: {
  filter: KommunikationFilter
  /** Erhöhen nach Versand, um Liste neu zu laden */
  reloadKey?: number
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KommunikationListeZeile[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)

  const load = useCallback(() => {
    startTransition(async () => {
      const list = await loadKommunikationListe(filter)
      setRows(list)
    })
  }, [filter])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const hasFilter = !!(
    filter.kundeId ||
    filter.leadId ||
    filter.angebotId ||
    filter.auftragId ||
    filter.rechnungId
  )

  if (!hasFilter) return null

  return (
    <>
      <Card collapsible title="Kommunikation" className={className} flush bodyClassName="p-0">
        {pending && rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-bw-text-muted">Lade …</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-bw-text-muted">
            Noch keine E-Mails in diesem Kontext protokolliert.
          </p>
        ) : (
          <ul className="divide-y divide-bw-border">
            {rows.map((row) => {
              const inbound = row.richtung === 'empfangen'
              const vonAn = inbound
                ? row.von_email ?? row.an_email
                : row.an_email
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewId(row.id)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-bw-hover"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {inbound ? (
                        <ArrowDownLeft className="h-4 w-4 shrink-0 text-bw-primary" aria-hidden />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                      )}
                      <span className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">
                        {freitextMailTypLabel(row.typ, row.kontext_typ)}
                      </span>
                      {row.status === 'fehler' ? (
                        <span className="rounded bg-red-100 px-1.5 text-[10px] text-red-800">Fehler</span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm font-medium text-bw-text">{row.betreff}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-bw-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden />
                        {inbound ? `Von ${vonAn}` : `An ${vonAn}`}
                      </span>
                      <span>·</span>
                      <span>{formatDatumZeit(row.created_at)}</span>
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <EmailLogPreviewModal
        emailLogId={previewId}
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
      />
    </>
  )
}
