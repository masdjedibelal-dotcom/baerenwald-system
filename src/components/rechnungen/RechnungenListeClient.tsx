'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ListFilterSection,
  ListGridShell,
  ListMobileStack,
} from '@/components/layout/ListPageParts'
import { EntityListShell, AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { useSort } from '@/hooks/useSort'
import { EmptyState } from '@/components/layout/EmptyState'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { RechnungenExportModal } from '@/components/rechnungen/RechnungenExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import type { RechnungListeZeile } from '@/lib/types'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDatum, formatPreis, cn } from '@/lib/utils'
import { rechnungInRechnungenPipeline } from '@/lib/crm/pipeline-liste-filter'
import {
  countRechnungStatusFilters,
  isRechnungUeberfaellig,
  matchesRechnungStatusFilter,
  rechnungDisplayStatusLabel,
  RECHNUNG_ALLE_STATUS_FILTERS,
  RECHNUNG_PIPELINE_STATUS_FILTERS,
  RECHNUNG_STATUS_FILTER_LABELS,
  type RechnungListenStatusFilter,
} from '@/lib/rechnungen/rechnung-liste-helpers'
import { gruppierenNachKunde, gruppierenNachSchluessel } from '@/lib/crm/liste-gruppierung'
import { mahnstufeListenLabel } from '@/lib/rechnungen/mahnverlauf'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'

const RECHNUNG_EXPORT_FIELDS: ExportField[] = [
  { key: 'rechnungsnummer', label: 'Nummer' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'brutto', label: 'Betrag' },
  { key: 'status', label: 'Status' },
  { key: 'rechnungsdatum', label: 'Datum' },
  { key: 'faellig_am', label: 'Fällig' },
  { key: 'auftrag', label: 'Auftrag' },
]

function kundenName(k: RechnungListeZeile['kunden']): string | null {
  if (!k) return null
  const row = Array.isArray(k) ? k[0] : k
  if (!row) return null
  const display = kundeDisplayName(row)
  return display !== '—' ? display : null
}

function auftragTitel(r: RechnungListeZeile): string | null {
  const a = r.auftraege
  if (!a) return null
  if (Array.isArray(a)) return a[0]?.titel ?? null
  return a.titel ?? null
}

function isUeberfaellig(r: RechnungListeZeile): boolean {
  return isRechnungUeberfaellig(r)
}

function displayStatusLabel(r: RechnungListeZeile): string {
  return rechnungDisplayStatusLabel(r)
}

function statusBadgeClass(r: RechnungListeZeile) {
  if (r.status === 'storniert') return 'bg-red-100 text-red-900'
  if (r.status === 'bezahlt') return 'bg-emerald-100 text-emerald-900'
  if (isUeberfaellig(r)) return 'bg-red-200 text-red-950 font-semibold'
  if (r.status === 'gesendet') return 'bg-blue-100 text-blue-900'
  return 'bg-bw-hover text-bw-text'
}

type RechnungSortRow = {
  rechnungsnummer: string
  kunde: string
  brutto: number
  status: string
  rechnungsdatum: string
  faellig_am: string
}

const RECHNUNG_GRID_COLS = '130px 2fr 1.2fr 120px 110px 110px 60px'

function rechnungListCardBadge(r: RechnungListeZeile) {
  const mahn = mahnstufeListenLabel(r)
  if (isUeberfaellig(r)) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <StatusBadge status="cancel" label="Überfällig" />
        {mahn ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
            {mahn}
          </span>
        ) : null}
      </span>
    )
  }
  if (r.status === 'bezahlt') {
    return <StatusBadge status="order" label="Bezahlt" />
  }
  if (r.status === 'gesendet') {
    return <StatusBadge status="offer" label="Gesendet" />
  }
  if (r.status === 'storniert') {
    return <StatusBadge status="cancel" label="Storniert" />
  }
  return <StatusBadge status="done" label="Entwurf" />
}

export function RechnungenListeClient({
  rows,
  mode = 'page',
  selectedId = null,
}: {
  rows: RechnungListeZeile[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const { exportToCSV } = useExport()
  const [pipelineOnly, setPipelineOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState<RechnungListenStatusFilter>('offen')
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [darstellung, setDarstellung] = useState<'liste' | 'auftrag' | 'kunde'>('liste')

  const pipelineRows = useMemo(
    () => rows.filter((r) => rechnungInRechnungenPipeline(r)),
    [rows]
  )
  const baseRows = pipelineOnly ? pipelineRows : rows

  const statusFilterOptions = pipelineOnly
    ? RECHNUNG_PIPELINE_STATUS_FILTERS
    : RECHNUNG_ALLE_STATUS_FILTERS

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const statusCounts = useMemo(
    () => countRechnungStatusFilters(baseRows, statusFilterOptions),
    [baseRows, statusFilterOptions]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return baseRows.filter((r) => {
      if (!matchesRechnungStatusFilter(r, statusFilter)) return false
      if (dateRange && !datumInZeitraum(r.rechnungsdatum, dateRange)) return false
      if (!needle) return true
      const pool = [
        r.rechnungsnummer,
        kundenName(r.kunden) ?? '',
        auftragTitel(r) ?? '',
        displayStatusLabel(r),
      ]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [baseRows, statusFilter, q, dateRange])

  const sortRows = useMemo(
    (): RechnungSortRow[] =>
      filtered.map((r) => ({
        rechnungsnummer: r.rechnungsnummer,
        kunde: kundenName(r.kunden) ?? '',
        brutto: r.brutto ?? 0,
        status: displayStatusLabel(r),
        rechnungsdatum: r.rechnungsdatum ?? '',
        faellig_am: r.faellig_am ?? '',
      })),
    [filtered]
  )

  const { sorted: sortedRows, field, dir, handleSort, resetSort } = useSort(sortRows, 'rechnungsdatum')

  const sorted = useMemo(() => {
    const byNummer = new Map(filtered.map((r) => [r.rechnungsnummer, r]))
    return sortedRows.map((row) => byNummer.get(row.rechnungsnummer)).filter(Boolean) as RechnungListeZeile[]
  }, [filtered, sortedRows])

  const auftragGruppen = useMemo(
    () =>
      gruppierenNachSchluessel(
        sorted,
        (r) => {
          const titel = auftragTitel(r)
          return titel ? `auftrag:${titel}` : 'ohne-auftrag'
        },
        (r, key) => (key === 'ohne-auftrag' ? 'Ohne Auftrag' : auftragTitel(r) ?? 'Auftrag')
      ),
    [sorted]
  )

  const kundenGruppen = useMemo(
    () =>
      gruppierenNachKunde(
        sorted,
        () => null,
        (r) => kundenName(r.kunden) ?? 'Ohne Kunde'
      ),
    [sorted]
  )

  const hasFilters = !!(
    statusFilter !== (pipelineOnly ? 'offen' : '') ||
    zeitraum !== 'alle' ||
    q.trim() ||
    !pipelineOnly ||
    darstellung !== 'liste'
  )

  function resetFilters() {
    setPipelineOnly(true)
    setDarstellung('liste')
    setStatusFilter('offen')
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
        id: 'z',
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

  function exportRow(r: RechnungListeZeile): Record<string, unknown> {
    return {
      rechnungsnummer: r.rechnungsnummer,
      kunde: kundenName(r.kunden) ?? '',
      brutto: r.brutto,
      status: displayStatusLabel(r),
      rechnungsdatum: r.rechnungsdatum,
      faellig_am: r.faellig_am ?? '',
      auftrag: auftragTitel(r) ?? '',
    }
  }

  function openDetail(id: string) {
    router.push(`/rechnungen/${id}`)
  }

  const isPane = mode === 'pane'

  const listenGruppen = useMemo(() => {
    if (darstellung === 'auftrag') return auftragGruppen
    if (darstellung === 'kunde') return kundenGruppen
    return [{ key: 'liste', label: '', items: sorted }]
  }, [darstellung, auftragGruppen, kundenGruppen, sorted])

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chipGroups={[
          {
            label: 'Ansicht',
            options: [
              { label: 'Pipeline', value: 'pipeline', count: pipelineRows.length },
              { label: 'Alle', value: 'all', count: rows.length },
            ],
            selected: [pipelineOnly ? 'pipeline' : 'all'],
            onChange: (v) => {
              const isPipeline = (v[0] ?? 'pipeline') === 'pipeline'
              setPipelineOnly(isPipeline)
              setStatusFilter(isPipeline ? 'offen' : '')
            },
          },
          {
            label: 'Status',
            options: statusFilterOptions.map((key) => ({
              value: key,
              label: RECHNUNG_STATUS_FILTER_LABELS[key],
              count: statusCounts[key],
            })),
            selected: [statusFilter],
            onChange: (v) =>
              setStatusFilter((v[0] ?? (pipelineOnly ? 'offen' : '')) as RechnungListenStatusFilter),
          },
          {
            label: 'Darstellung',
            options: [
              { label: 'Liste', value: 'liste', count: filtered.length },
              { label: 'Nach Auftrag', value: 'auftrag', count: auftragGruppen.length },
              { label: 'Nach Kunde', value: 'kunde', count: kundenGruppen.length },
            ],
            selected: [darstellung],
            onChange: (v) => setDarstellung((v[0] ?? 'liste') as 'liste' | 'auftrag' | 'kunde'),
          },
        ]}
      >
        <ListFilterBar
          hideStatusFilter
          statusLabel="—"
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
          searchPlaceholder="Nummer, Kunde, Auftrag"
          onReset={resetFilters}
          hasActiveFilters={hasFilters}
          tags={filterTags}
          onExportClick={() => setExportOpen(true)}
          resultCount={filtered.length}
          sort={{
            options: [
              { field: 'rechnungsnummer', label: 'Nummer' },
              { field: 'kunde', label: 'Kunde' },
              { field: 'brutto', label: 'Betrag' },
              { field: 'status', label: 'Status' },
              { field: 'rechnungsdatum', label: 'Datum' },
              { field: 'faellig_am', label: 'Fällig' },
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
          icon={Receipt}
          title="Keine Rechnungen"
          description={
            rows.length === 0
              ? 'Legen Sie eine Rechnung an.'
              : pipelineOnly && pipelineRows.length === 0
                ? 'Keine offenen Rechnungen in der Pipeline.'
                : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {listenGruppen.map((gruppe) => (
              <div key={gruppe.key} className="space-y-2">
                {gruppe.label ? (
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                    {gruppe.label} ({gruppe.items.length})
                  </p>
                ) : null}
                {gruppe.items.map((r) => {
              const kName = kundenName(r.kunden) ?? '—'
              return (
                <AppEntityListRow
                  key={r.id}
                  href={isPane ? `/rechnungen/${r.id}` : undefined}
                  onClick={isPane ? undefined : () => openDetail(r.id)}
                  className={cn(selectedId === r.id && 'ring-2 ring-bw-primary/40')}
                  avatar={<ListAvatar name={kName} />}
                  title={kName}
                  line2={auftragTitel(r) ?? undefined}
                  line3={r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
                  line4={`${formatPreis(r.brutto)} · fällig ${
                    r.faellig_am ? new Date(r.faellig_am).toLocaleDateString('de-DE') : '—'
                  }`}
                  badge={rechnungListCardBadge(r)}
                />
              )
            })}
              </div>
            ))}
          </ListMobileStack>

          <ListGridShell minWidth="900px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div className="list-row-grid head" style={{ gridTemplateColumns: RECHNUNG_GRID_COLS }}>
              <SortableHeader
                label="Nr."
                field="rechnungsnummer"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <div>Rechnung</div>
              <SortableHeader label="Kunde" field="kunde" currentField={field} currentDir={dir} onSort={handleSort} />
              <div className="text-right">
                <SortableHeader label="Betrag" field="brutto" currentField={field} currentDir={dir} onSort={handleSort} />
              </div>
              <SortableHeader
                label="Fällig"
                field="faellig_am"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <SortableHeader label="Status" field="status" currentField={field} currentDir={dir} onSort={handleSort} />
              <div aria-hidden />
            </div>
            {listenGruppen.map((gruppe) => (
              <div key={gruppe.key} className="col-span-full space-y-1">
                {gruppe.label ? (
                  <p className="list-row-grid px-3 py-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                    {gruppe.label} ({gruppe.items.length})
                  </p>
                ) : null}
                {gruppe.items.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(r.id)
                  }
                }}
                className={cn(
                  'list-row-grid',
                  selectedId === r.id && isPane && 'ring-2 ring-bw-primary/40'
                )}
                style={{ gridTemplateColumns: RECHNUNG_GRID_COLS }}
              >
                <p className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                  {r.rechnungsnummer}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-bw-text">
                    {auftragTitel(r) ?? 'Rechnung'}
                  </p>
                  <p className="truncate text-[12px]" style={{ color: 'var(--text-3)' }}>
                    {r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
                  </p>
                </div>
                <p className="truncate text-[13px] text-bw-text">{kundenName(r.kunden) ?? '—'}</p>
                <p className="truncate text-right text-[13px] font-semibold tabular-nums text-bw-text">
                  {formatPreis(r.brutto)}
                </p>
                <p
                  className={cn(
                    'truncate text-[12.5px] tabular-nums',
                    isUeberfaellig(r) ? 'text-red-800' : 'text-bw-text'
                  )}
                >
                  {r.faellig_am ? formatDatum(r.faellig_am) : '—'}
                </p>
                <div>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs',
                      statusBadgeClass(r)
                    )}
                  >
                    {displayStatusLabel(r)}
                  </span>
                </div>
                <div aria-hidden />
              </div>
            ))}
              </div>
            ))}
          </ListGridShell>
        </>
      )}

      <RechnungenExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={RECHNUNG_EXPORT_FIELDS}
        zeitraum={zeitraum}
        customFrom={customFrom}
        customTo={customTo}
        onCsvDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : rows
          const data = source.map(exportRow)
          const fields = RECHNUNG_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'rechnungen')
        }}
      />
    </EntityListShell>
  )
}
