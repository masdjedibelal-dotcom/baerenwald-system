'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockBadge, MockChip, MockEmpty } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
import { formatDatumZeit } from '@/lib/utils'

export function KommunikationCard({
  filter,
  reloadKey = 0,
  className,
  toolbar,
}: {
  filter: KommunikationFilter
  reloadKey?: number
  className?: string
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
      <div className={className}>
        <MockCard title="Kommunikation" icon="mail">
          {toolbar ? <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{toolbar}</div> : null}

          <div className="chiprow" style={{ marginBottom: 12 }}>
            {(
              [
                { label: 'Alle', value: 'alle' as const, count: counts.alle },
                { label: 'System', value: 'system' as const, count: counts.system },
                { label: 'Direkt', value: 'direkt' as const, count: counts.direkt },
              ] as const
            ).map((opt) => (
              <MockChip
                key={opt.value}
                active={mailFilter === opt.value}
                count={opt.count || undefined}
                onClick={() => setMailFilter(opt.value)}
              >
                {opt.label}
              </MockChip>
            ))}
          </div>

          {pending && rows.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Lade …</p>
          ) : sichtbar.length === 0 ? (
            <MockEmpty
              icon="mail"
              title="Keine E-Mails"
              hint={
                ausgehend.length === 0
                  ? 'Noch keine ausgehenden E-Mails protokolliert.'
                  : 'Keine E-Mails für diesen Filter.'
              }
            />
          ) : (
            <div style={{ margin: -14 }}>
              <div
                className="list-row head"
                style={{ gridTemplateColumns: '1fr 120px 100px 140px 40px' }}
              >
                <div>Betreff</div>
                <div className="hidden sm:block">Absender</div>
                <div>Art</div>
                <div className="hidden md:block">Datum</div>
                <div />
              </div>
              {sichtbar.map((row) => {
                const art = kommunikationMailArt(row)
                const absender = kommunikationMailAbsender(row, art)
                return (
                  <div
                    key={row.id}
                    className="list-row"
                    style={{ gridTemplateColumns: '1fr 120px 100px 140px 40px', alignItems: 'center' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={row.betreff}
                      >
                        {row.betreff || '—'}
                      </div>
                      {row.status === 'fehler' ? (
                        <span style={{ marginTop: 4, display: 'inline-block' }}>
                          <MockBadge kind="storniert">Fehler</MockBadge>
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="hidden sm:block"
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {absender}
                    </div>
                    <div>
                      <MockBadge kind={art === 'system' ? 'plain' : 'aktiv'}>
                        {kommunikationMailArtLabel(art)}
                      </MockBadge>
                    </div>
                    <div
                      className="hidden md:block"
                      style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                    >
                      {formatDatumZeit(row.created_at)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="qa-btn"
                        title="E-Mail ansehen"
                        aria-label="E-Mail ansehen"
                        onClick={() => setPreviewId(row.id)}
                      >
                        <MockIcon n="eye" size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </MockCard>
      </div>

      <EmailLogPreviewModal
        emailLogId={previewId}
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
      />
    </>
  )
}
