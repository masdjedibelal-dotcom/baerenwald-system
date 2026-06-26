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
import {
  filterAktiveAngeboteListe,
  zaehleWeitereVersionen,
} from '@/lib/angebote/angebot-lebenszyklus'
import { findeAngebotGruppe } from '@/lib/angebote/gruppierung-angebote-liste'
import { gruppierenNachKunde } from '@/lib/crm/liste-gruppierung'
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
  'ersetzt',
]

const FILTER_LABELS: Record<FilterKey, string> = {
  '': 'Alle',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Abgelaufen',
  ersetzt: 'Ersetzt',
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
  const [statusFilter, setStatusFilter] = useState<FilterKey>('')
  const [pipelineOnly, setPipelineOnly] = useState(true)
  const [darstellung, setDarstellung] = useState<'liste' | 'kunde'>('liste')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)

  const angebotIdsMitAuftragSet = useMemo(
    () => new Set(angebotIdsMitAuftrag),
    [angebotIdsMitAuftrag]
  )
  const angebotIdsMitRechnungSet = useMemo(
    () => new Set(angebotIdsMitRechnung),
    [angebotIdsMitRechnung]
  )

  const pipelineAngebote = useMemo(
    () =>
      angebote.filter((a) =>
        angebotInAngebotePipeline(a, angebotIdsMitAuftragSet, angebotIdsMitRechnungSet)
      ),
    [angebote, angebotIdsMitAuftragSet, angebotIdsMitRechnungSet]
  )
  const pipelineGrouped = useMemo(
    () => filterAktiveAngeboteListe(pipelineAngebote),
    [pipelineAngebote]
  )
  const baseAngebote = pipelineOnly ? pipelineGrouped : angebote
  const listSourceForVersionCount = pipelineOnly ? pipelineAngebote : angebote

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

  const kundenGruppen = useMemo(
    () =>
      gruppierenNachKunde(
        sorted.map((r) => r.angebot),
        (a) => a.kunde_id ?? null,
        (a) => kundeNameAusAngebot(a)
      ),
    [sorted]
  )

  const displayRows = useMemo(() => {
    const rows: Array<{
      angebot: AngebotListeEintrag
      isVersion?: boolean
      groupKey: string
      weitere: number
    }> = []
    for (const { angebot: a } of sorted) {
      const gruppe = pipelineOnly ? findeAngebotGruppe(a, listSourceForVersionCount) : null
      const groupKey = gruppe?.key ?? a.id
      const weitere = pipelineOnly ? zaehleWeitereVersionen(a, listSourceForVersionCount) : 0
      rows.push({ angebot: a, groupKey, weitere })
      if (pipelineOnly && gruppe && expandedGroups.has(groupKey)) {
        for (const w of gruppe.weitere) {
          rows.push({ angebot: w, isVersion: true, groupKey, weitere: 0 })
        }
      }
    }
    return rows
  }, [sorted, pipelineOnly, listSourceForVersionCount, expandedGroups])

  function toggleVersionGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasFilters = !!(statusFilter || zeitraum !== 'alle' || q.trim() || !pipelineOnly || darstellung !== 'liste')

  function resetAllFilters() {
    setStatusFilter('')
    setPipelineOnly(true)
    setDarstellung('liste')
    setExpandedGroups(new Set())
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
              { label: 'Pipeline', value: 'pipeline', count: pipelineGrouped.length },
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
          {
            label: 'Darstellung',
            options: [
              { label: 'Liste', value: 'liste', count: filtered.length },
              { label: 'Nach Kunde', value: 'kunde', count: kundenGruppen.length },
            ],
            selected: [darstellung],
            onChange: (v) => setDarstellung((v[0] ?? 'liste') as 'liste' | 'kunde'),
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
            {darstellung === 'kunde'
              ? kundenGruppen.map((gruppe) => (
                  <div key={gruppe.key} className="space-y-2">
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                      {gruppe.label} ({gruppe.items.length})
                    </p>
                    {gruppe.items.map((a) => {
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
                  </div>
                ))
              : displayRows.map(({ angebot: a, isVersion, groupKey, weitere }) => {
              const st = resolveStatusEinfach(a)
              const name = kundeNameAusAngebot(a)
              return (
                <AppEntityListRow
                  key={a.id}
                  href={isPane ? `/angebote/${a.id}` : undefined}
                  onClick={isPane ? undefined : () => openDetail(a.id)}
                  className={cn(
                    selectedId === a.id && 'ring-2 ring-bw-primary/40',
                    isVersion && 'ml-4 border-l-2 border-bw-border pl-3'
                  )}
                  avatar={<ListAvatar name={name} />}
                  title={name}
                  line2={`${angebotSituation(a)} · ${angebotBereiche(a)}`}
                  line3={a.created_at ? formatDatumZeit(a.created_at) : '—'}
                  line4={
                    weitere > 0 ? (
                      <button
                        type="button"
                        className="text-left text-[11px] text-bw-link hover:underline"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleVersionGroup(groupKey)
                        }}
                      >
                        {expandedGroups.has(groupKey)
                          ? 'Versionen einklappen'
                          : `+${weitere} ältere Version${weitere === 1 ? '' : 'en'} anzeigen`}
                        {' · '}
                        {betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
                      </button>
                    ) : (
                      betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)
                    )
                  }
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
            {darstellung === 'kunde'
              ? kundenGruppen.map((gruppe) => (
                  <div key={gruppe.key} className="col-span-full space-y-1">
                    <p className="list-row-grid px-3 py-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                      {gruppe.label} ({gruppe.items.length})
                    </p>
                    {gruppe.items.map((a) => {
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
                          <p className="list-row-primary truncate">{name}</p>
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
                  </div>
                ))
              : displayRows.map(({ angebot: a, isVersion, groupKey, weitere }) => {
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
                  className={cn('list-row-grid', isVersion && 'bg-bw-hover/30')}
                  style={{ gridTemplateColumns: ANGEBOTE_GRID_COLS }}
                >
                  <ListAvatar name={name} />
                  <div className="min-w-0">
                    <p className={cn('list-row-primary truncate', isVersion && 'pl-2')}>{name}</p>
                    {weitere > 0 ? (
                      <button
                        type="button"
                        className="truncate text-[11px] text-bw-link hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVersionGroup(groupKey)
                        }}
                      >
                        {expandedGroups.has(groupKey)
                          ? 'Versionen einklappen'
                          : `+${weitere} ältere Version${weitere === 1 ? '' : 'en'}`}
                      </button>
                    ) : isVersion ? (
                      <p className="truncate text-[11px] text-bw-text-muted">Ältere Version</p>
                    ) : null}
                  </div>
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
