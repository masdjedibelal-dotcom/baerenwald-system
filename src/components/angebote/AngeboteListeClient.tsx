'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import { deleteAngebot } from '@/app/(dashboard)/angebote/actions'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { runDuplicateAngebot } from '@/lib/list-actions'
import {
  MockBadge,
  MockChip,
  MockEmpty,
  MockIcon,
  MockPager,
  MockSortHead,
  MockToolbar,
} from '@/components/mock-ui'
import { useListPage } from '@/hooks/useListPage'
import {
  ANGEBOT_EINFACH_LABELS,
  betragAnzeige,
  kundeNameAusAngebot,
  leistungAnzeige,
  matchesEinfachFilter,
  resolveStatusEinfach,
  type AngebotStatusEinfach,
} from '@/lib/angebot-einfach'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { cn, formatDatumZeit } from '@/lib/utils'
import type { AngebotListeEintrag } from '@/lib/types'

type ChipFilterKey = '' | 'entwurf' | 'gesendet' | 'angenommen' | 'abgelehnt'

const CHIP_FILTERS: ChipFilterKey[] = ['', 'entwurf', 'gesendet', 'angenommen', 'abgelehnt']

const FILTER_LABELS: Record<ChipFilterKey, string> = {
  '': 'Alle',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
}

const ANGEBOT_ROW_GRID = '110px 1.6fr 1.4fr 120px 110px 100px 40px'

type SortCol = 'nr' | 'angebot' | 'kunde' | 'betrag' | 'created_at' | 'status'

function angebotTitel(a: AngebotListeEintrag): string {
  const lf = leistungAnzeige(a)
  if (lf !== '—') return lf
  const situation = a.leads?.situation
  return situation ? leadSituationDisplay(situation) || '—' : '—'
}

function angebotBadgeKind(st: AngebotStatusEinfach): string {
  if (st === 'entwurf') return 'neu'
  if (st === 'gesendet') return 'warten'
  if (st === 'angenommen') return 'fertig'
  if (st === 'abgelehnt' || st === 'abgelaufen') return 'storniert'
  return 'plain'
}

export function AngeboteListeClient({
  angebote,
  angebotIdsMitAuftrag = [],
  angebotIdsMitRechnung = [],
  mode = 'page',
  selectedId = null,
}: {
  angebote: AngebotListeEintrag[]
  angebotIdsMitAuftrag?: string[]
  angebotIdsMitRechnung?: string[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const isPane = mode === 'pane'

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ChipFilterKey>('')
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ChipFilterKey, number>> = { '': angebote.length }
    for (const a of angebote) {
      for (const key of CHIP_FILTERS) {
        if (!key) continue
        if (matchesEinfachFilter(a, key)) c[key] = (c[key] ?? 0) + 1
      }
    }
    return c
  }, [angebote])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return angebote.filter((a) => {
      if (!matchesEinfachFilter(a, statusFilter)) return false
      if (!needle) return true
      const name = kundeNameAusAngebot(a).toLowerCase()
      const nr = (a.angebotsnr ?? a.id).toLowerCase()
      const titel = angebotTitel(a).toLowerCase()
      return name.includes(needle) || nr.includes(needle) || titel.includes(needle)
    })
  }, [angebote, statusFilter, query])

  const toggleSort = (col: SortCol) => {
    setSortCol((c) => {
      if (c === col) {
        setSortDir((d) => (d === 1 ? -1 : 1))
        return col
      }
      setSortDir(1)
      return col
    })
  }

  const sorted = useMemo(() => {
    const keyFn = (a: AngebotListeEintrag): string | number => {
      switch (sortCol) {
        case 'nr':
          return (a.angebotsnr ?? a.id).toLowerCase()
        case 'angebot':
          return angebotTitel(a).toLowerCase()
        case 'kunde':
          return kundeNameAusAngebot(a).toLowerCase()
        case 'betrag':
          return a.gesamt_fix ?? a.gesamt_max ?? a.gesamt_min ?? 0
        case 'created_at':
          return a.created_at ?? ''
        case 'status':
          return resolveStatusEinfach(a)
        default:
          return a.created_at ?? ''
      }
    }
    const dir = sortDir
    return [...filtered].sort((a, b) => {
      const av = keyFn(a)
      const bv = keyFn(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filtered, sortCol, sortDir])

  const paginationResetKey = `${statusFilter}|${query}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    sorted,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/angebote/${id}`)
  }

  return (
    <div>
      <MockToolbar query={query} onQueryChange={setQuery} placeholder="Angebote suchen..." />

      <div className="chiprow">
        {CHIP_FILTERS.map((key) => (
          <MockChip
            key={key || 'alle'}
            active={statusFilter === key}
            count={statusCounts[key]}
            onClick={() => setStatusFilter(key)}
          >
            {FILTER_LABELS[key]}
          </MockChip>
        ))}
      </div>

      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: ANGEBOT_ROW_GRID }}>
          <MockSortHead col="nr" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Nr.
          </MockSortHead>
          <MockSortHead
            col="angebot"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Angebot
          </MockSortHead>
          <MockSortHead col="kunde" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Kunde
          </MockSortHead>
          <MockSortHead
            col="betrag"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            right
          >
            Betrag
          </MockSortHead>
          <MockSortHead
            col="created_at"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Erstellt
          </MockSortHead>
          <MockSortHead col="status" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Status
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="file-invoice"
            title={angebote.length === 0 ? 'Noch keine Angebote' : 'Keine Treffer'}
            hint={
              angebote.length === 0
                ? 'Erstelle ein Angebot aus einer Anfrage.'
                : 'Suchbegriff anpassen oder Filter zurücksetzen'
            }
          />
        ) : (
          pageItems.map((a) => {
            const st = resolveStatusEinfach(a)
            const name = kundeNameAusAngebot(a)
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'list-row',
                  selectedId === a.id && isPane && 'active',
                  selectedId === a.id && isPane && 'ring-2 ring-[var(--green)]'
                )}
                style={{ gridTemplateColumns: ANGEBOT_ROW_GRID }}
                onClick={() => openDetail(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(a.id)
                  }
                }}
              >
                <div
                  style={{
                    color: 'var(--text-3)',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                  }}
                >
                  {a.angebotsnr ?? a.id.slice(0, 8)}
                </div>
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {angebotTitel(a)}
                </div>
                <div style={{ color: 'var(--text-2)' }}>{name}</div>
                <div
                  style={{
                    fontWeight: 500,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
                </div>
                <div style={{ color: 'var(--text-3)' }}>
                  {a.created_at ? formatDatumZeit(a.created_at) : '—'}
                </div>
                <div className="lc-status">
                  <MockBadge kind={angebotBadgeKind(st)}>{ANGEBOT_EINFACH_LABELS[st]}</MockBadge>
                </div>
                <div
                  className="row-actions always"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  <ActionsMenu
                    trigger={
                      <button type="button" className="qa-btn" title="Aktionen" aria-label="Aktionen">
                        <MockIcon n="dots" size={16} />
                      </button>
                    }
                    items={listEntityMenuItems(
                      'angebot',
                      {
                        titel: angebotTitel(a),
                        name,
                        status: st,
                      },
                      {
                        onEdit: () => openDetail(a.id),
                        onCopy: () => runDuplicateAngebot(a.id, router),
                        onPdf: () => window.open(`/api/angebote/${a.id}/pdf`, '_blank'),
                        onSend: () => openDetail(a.id),
                        onDelete: () => {
                          void deleteAngebot(a.id).then((r) => {
                            if ('error' in r) toast.error(r.error)
                            else {
                              toast.success('Angebot gelöscht')
                              router.refresh()
                            }
                          })
                        },
                        deleteLabel: angebotTitel(a),
                      }
                    )}
                    sheetTitle="Angebot"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {angebote.length === 0 && !isPane ? (
        <div style={{ marginTop: 12 }}>
          <Link href="/anfragen" className="btn btn-primary btn-sm">
            Zu Anfragen
          </Link>
        </div>
      ) : null}

      <MockPager
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        unit="Angebote"
        onPageChange={(p) => setPageIndex(p - 1)}
      />
    </div>
  )
}
