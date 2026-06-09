'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ListFilterSection,
  ListGridShell,
  ListMobileStack,
} from '@/components/layout/ListPageParts'
import { EntityListShell, AppEntityListRow } from '@/components/layout/app'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { EmptyState } from '@/components/layout/EmptyState'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  betragAnzeige,
  kundeNameAusAngebot,
  matchesEinfachFilter,
  resolveStatusEinfach,
  type AngebotStatusEinfach,
} from '@/lib/angebot-einfach'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import {
  datumInZeitraum,
  getZeitraumRange,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { BEREICH_LABELS, cn, formatDatumZeit } from '@/lib/utils'
import { formatRegionFromKunde } from '@/lib/list-display-helpers'
import { angebotInAngebotePipeline } from '@/lib/crm/pipeline-liste-filter'
import type { AngebotListeEintrag } from '@/lib/types'

type FilterKey = '' | AngebotStatusEinfach

/** Gleiche Spaltenstruktur wie Anfragen-Liste */
const ANGEBOTE_GRID_COLS =
  '42px minmax(160px,1.6fr) minmax(120px,1.1fr) minmax(130px,1.2fr) minmax(128px,0.95fr) minmax(72px,0.75fr) 100px 100px'

const FILTER_ORDER: FilterKey[] = [
  '',
  'entwurf',
  'gesendet',
  'angenommen',
  'abgelehnt',
  'abgelaufen',
]

const FILTER_LABELS: Record<FilterKey, string> = {
  '': 'Alle',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Abgelaufen',
}

type SortRow = {
  angebot: AngebotListeEintrag
  kunde: string
  created_at: string
  betrag: number
  status: AngebotStatusEinfach
}

function angebotSituation(a: AngebotListeEintrag): string {
  const situation = a.leads?.situation
  return situation ? leadSituationDisplay(situation) || '—' : '—'
}

function angebotBereiche(a: AngebotListeEintrag): string {
  const lead = a.leads
  if (!lead) return '—'
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (!bereiche.length) return '—'
  return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
}

function angebotRegion(a: AngebotListeEintrag): string {
  return formatRegionFromKunde({ plz: a.leads?.plz ?? a.kunden?.plz, kunden: a.kunden })
}

export function AngeboteListeClient({
  angebote,
  angebotIdsMitAuftrag = [],
  mode = 'page',
  selectedId = null,
}: {
  angebote: AngebotListeEintrag[]
  angebotIdsMitAuftrag?: string[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<FilterKey>('')
  const [pipelineOnly, setPipelineOnly] = useState(true)
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)

  const angebotIdsMitAuftragSet = useMemo(
    () => new Set(angebotIdsMitAuftrag),
    [angebotIdsMitAuftrag]
  )

  const pipelineAngebote = useMemo(
    () => angebote.filter((a) => angebotInAngebotePipeline(a, angebotIdsMitAuftragSet)),
    [angebote, angebotIdsMitAuftragSet]
  )
  const baseAngebote = pipelineOnly ? pipelineAngebote : angebote

  const statusCounts = useMemo(() => {
    const c: Partial<Record<FilterKey, number>> = { '': baseAngebote.length }
    for (const a of baseAngebote) {
      for (const key of FILTER_ORDER) {
        if (!key) continue
        if (matchesEinfachFilter(a, key)) c[key] = (c[key] ?? 0) + 1
      }
    }
    return c
  }, [baseAngebote])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return baseAngebote.filter((a) => {
      if (!matchesEinfachFilter(a, statusFilter)) return false
      if (dateRange && !datumInZeitraum(a.created_at, dateRange)) return false
      if (!needle) return true
      const name = kundeNameAusAngebot(a).toLowerCase()
      const nr = (a.angebotsnr ?? a.id).toLowerCase()
      const situation = angebotSituation(a).toLowerCase()
      const bereiche = angebotBereiche(a).toLowerCase()
      return (
        name.includes(needle) ||
        nr.includes(needle) ||
        situation.includes(needle) ||
        bereiche.includes(needle)
      )
    })
  }, [baseAngebote, statusFilter, debouncedQ, dateRange])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((a) => ({
        angebot: a,
        kunde: kundeNameAusAngebot(a),
        created_at: a.created_at,
        betrag: a.gesamt_fix ?? a.gesamt_max ?? a.gesamt_min ?? 0,
        status: resolveStatusEinfach(a),
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const hasFilters = !!(statusFilter || zeitraum !== 'alle' || q.trim() || !pipelineOnly)

  function resetAllFilters() {
    setStatusFilter('')
    setPipelineOnly(true)
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
    resetSort()
  }

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (zeitraum !== 'alle') {
      t.push({
        id: 'zeitraum',
        label: zeitraumLabel(zeitraum),
        onRemove: () => {
          setZeitraum('alle')
          setCustomFrom('')
          setCustomTo('')
        },
      })
    }
    if (q.trim()) {
      t.push({ id: 'q', label: `„${q.trim()}“`, onRemove: () => setQ('') })
    }
    return t
  }, [zeitraum, q])

  function openDetail(id: string) {
    router.push(`/angebote/${id}`)
  }

  const isPane = mode === 'pane'

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chipGroups={[
          {
            label: 'Ansicht',
            options: [
              { label: 'Pipeline', value: 'pipeline', count: pipelineAngebote.length },
              { label: 'Alle', value: 'all', count: angebote.length },
            ],
            selected: [pipelineOnly ? 'pipeline' : 'all'],
            onChange: (v) => setPipelineOnly((v[0] ?? 'pipeline') === 'pipeline'),
          },
          {
            label: 'Status',
            options: FILTER_ORDER.map((key) => ({
              value: key,
              label: FILTER_LABELS[key],
              count: statusCounts[key],
            })),
            selected: [statusFilter],
            onChange: (v) => setStatusFilter((v[0] ?? '') as FilterKey),
          },
        ]}
      >
        <ListFilterBar
          hideStatusFilter
          statusLabel="Status"
          statusOptions={[{ value: '', label: '—' }]}
          statusValue=""
          onStatusChange={() => {}}
          zeitraumValue={zeitraum}
          onZeitraumChange={setZeitraum}
          showCustomDates={zeitraum === 'benutzerdefiniert'}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Suchen…"
          onReset={resetAllFilters}
          hasActiveFilters={hasFilters}
          tags={filterTags}
          resultCount={filtered.length}
          sort={{
            options: [
              { field: 'kunde', label: 'Name' },
              { field: 'created_at', label: 'Erstellt' },
              { field: 'betrag', label: 'Betrag' },
              { field: 'status', label: 'Status' },
            ],
            currentField: field,
            currentDir: dir,
            onSort: (f) => (f ? handleSort(f) : resetSort()),
          }}
        />
      </ListFilterSection>
      }
    >
      <PageHeader className={cn(isPane ? 'hidden' : 'hidden md:block')} />

      {sorted.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            angebote.length === 0
              ? 'Noch keine Angebote'
              : pipelineOnly && pipelineAngebote.length === 0
                ? 'Keine Angebote in der Pipeline'
                : 'Keine Treffer'
          }
          description={
            angebote.length === 0
              ? 'Erstelle ein Angebot aus einer Anfrage.'
              : pipelineOnly && pipelineAngebote.length === 0
                ? 'Angenommene oder abgeschlossene Angebote findest du unter „Alle“.'
                : 'Passe Filter oder Suche an.'
          }
          action={
            angebote.length === 0 && !isPane ? (
              <Link href="/anfragen" className="btn btn-primary btn-sm">
                Zu Anfragen
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {sorted.map(({ angebot: a }) => {
              const st = resolveStatusEinfach(a)
              const name = kundeNameAusAngebot(a)
              return (
                <AppEntityListRow
                  key={a.id}
                  href={isPane ? `/angebote/${a.id}` : undefined}
                  onClick={isPane ? undefined : () => openDetail(a.id)}
                  className={cn(selectedId === a.id && 'ring-2 ring-bw-primary/40')}
                  avatar={<ListAvatar name={name} />}
                  title={name}
                  line2={`${angebotSituation(a)} · ${angebotBereiche(a)}`}
                  line3={a.created_at ? formatDatumZeit(a.created_at) : '—'}
                  line4={betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
                  badge={<AngebotEinfachStatusBadge status={st} />}
                />
              )
            })}
          </ListMobileStack>

          <ListGridShell minWidth="1020px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div className="list-row-grid head" style={{ gridTemplateColumns: ANGEBOTE_GRID_COLS }}>
              <div />
              <SortableHeader label="Name" field="kunde" currentField={field} currentDir={dir} onSort={handleSort} />
              <div>Situation</div>
              <div>Bereiche</div>
              <SortableHeader
                label="Erstellt"
                field="created_at"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <div>Region</div>
              <div className="text-right">
                <SortableHeader
                  label="Betrag"
                  field="betrag"
                  currentField={field}
                  currentDir={dir}
                  onSort={handleSort}
                />
              </div>
              <SortableHeader label="Status" field="status" currentField={field} currentDir={dir} onSort={handleSort} />
            </div>
            {sorted.map(({ angebot: a }) => {
              const st = resolveStatusEinfach(a)
              const name = kundeNameAusAngebot(a)
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetail(a.id)
                    }
                  }}
                  className="list-row-grid"
                  style={{ gridTemplateColumns: ANGEBOTE_GRID_COLS }}
                >
                  <ListAvatar name={name} />
                  <p className="list-row-primary">{name}</p>
                  <p className="truncate text-[13px] text-bw-text">{angebotSituation(a)}</p>
                  <p className="truncate text-[13px] text-bw-text-muted">{angebotBereiche(a)}</p>
                  <p className="truncate text-[13px] tabular-nums text-bw-text-muted">
                    {a.created_at ? formatDatumZeit(a.created_at) : '—'}
                  </p>
                  <p className="truncate text-[13px] text-bw-text-muted">{angebotRegion(a)}</p>
                  <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                    {betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
                  </p>
                  <AngebotEinfachStatusBadge status={st} />
                </div>
              )
            })}
          </ListGridShell>
        </>
      )}
    </EntityListShell>
  )
}
