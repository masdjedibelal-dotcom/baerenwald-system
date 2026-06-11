'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FilterChips } from '@/components/ui/FilterChips'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import {
  loadKommunikationListe,
  type KommunikationFilter,
} from '@/app/(dashboard)/kommunikation/actions'
import {
  filterKommunikationRows,
  kommunikationMailAbsender,
  kommunikationMailArt,
  kommunikationMailArtLabel,
  type KommunikationMailFilter,
} from '@/lib/kommunikation/mail-liste-helpers'
import type { KommunikationListeZeile } from '@/lib/kommunikation/types'
import type { ReactNode } from 'react'
import { cn, formatDatumZeit } from '@/lib/utils'

export function KommunikationCard({
  filter,
  reloadKey = 0,
  className,
  toolbar,
}: {
  filter: KommunikationFilter
  /** Erhöhen nach Versand, um Liste neu zu laden */
  reloadKey?: number
  className?: string
  /** Aktionen oberhalb der Mail-Liste (z. B. E-Mail schreiben, Angebot versenden) */
  toolbar?: ReactNode
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KommunikationListeZeile[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [mailFilter, setMailFilter] = useState<KommunikationMailFilter>('alle')

  const filterKey = [
    filter.kundeId ?? '',
    filter.leadId ?? '',
    filter.angebotId ?? '',
    filter.auftragId ?? '',
    filter.rechnungId ?? '',
  ].join('|')

  const filterRef = useRef(filter)
  filterRef.current = filter

  const load = useCallback(() => {
    startTransition(async () => {
      const list = await loadKommunikationListe(filterRef.current)
      setRows(list)
    })
  }, [filterKey])

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

  const ausgehend = useMemo(
    () => rows.filter((r) => r.richtung !== 'empfangen'),
    [rows]
  )

  const counts = useMemo(() => {
    const system = ausgehend.filter((r) => kommunikationMailArt(r) === 'system').length
    const direkt = ausgehend.filter((r) => kommunikationMailArt(r) === 'direkt').length
    return { alle: ausgehend.length, system, direkt }
  }, [ausgehend])

  const sichtbar = useMemo(
    () => filterKommunikationRows(rows, mailFilter),
    [rows, mailFilter]
  )

  if (!hasFilter) return null

  return (
    <>
      <Card collapsible title="Kommunikation" className={className} flush bodyClassName="p-0">
        {toolbar ? <div className="border-b border-bw-border px-4 py-3">{toolbar}</div> : null}
        <div className="space-y-3 px-4 py-3">
          <FilterChips
            options={[
              { label: 'Alle', value: 'alle', count: counts.alle || undefined },
              { label: 'System', value: 'system', count: counts.system || undefined },
              { label: 'Direkt', value: 'direkt', count: counts.direkt || undefined },
            ]}
            selected={[mailFilter]}
            onChange={(values) => setMailFilter((values[0] as KommunikationMailFilter) ?? 'alle')}
          />
        </div>

        {pending && rows.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-bw-text-muted">Lade …</p>
        ) : sichtbar.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-bw-text-muted">
            {ausgehend.length === 0
              ? 'Noch keine ausgehenden E-Mails an den Kunden protokolliert.'
              : 'Keine E-Mails für diesen Filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-bw-border bg-bw-bg text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                  <th className="px-4 py-2 font-semibold">Betreff</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Absender</th>
                  <th className="px-3 py-2 font-semibold">Art</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Datum</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    <span className="sr-only">Vorschau</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bw-border">
                {sichtbar.map((row) => {
                  const art = kommunikationMailArt(row)
                  const absender = kommunikationMailAbsender(row, art)
                  return (
                    <tr key={row.id} className="hover:bg-bw-hover">
                      <td className="max-w-[220px] px-4 py-2.5">
                        <p className="truncate font-medium text-bw-text" title={row.betreff}>
                          {row.betreff || '—'}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-bw-text-muted sm:hidden">
                          {absender} · {formatDatumZeit(row.created_at)}
                        </p>
                        {row.status === 'fehler' ? (
                          <span className="mt-1 inline-block rounded bg-red-100 px-1.5 text-[10px] text-red-800">
                            Fehler
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden max-w-[160px] truncate px-3 py-2.5 text-bw-text-muted sm:table-cell">
                        {absender}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                            art === 'system'
                              ? 'bg-bw-bg text-bw-text-muted'
                              : 'bg-[#EAF3DE] text-[#1A3D2B]'
                          )}
                        >
                          {kommunikationMailArtLabel(art)}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-bw-text-muted md:table-cell">
                        {formatDatumZeit(row.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPreviewId(row.id)}
                          className="btn btn-ghost btn-sm inline-flex gap-1 px-2"
                          aria-label="E-Mail ansehen"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          <span className="hidden sm:inline">Ansehen</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
