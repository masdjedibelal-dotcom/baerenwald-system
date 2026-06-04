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
import { EntityListShell, AppListFilterRail, AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { useSort } from '@/hooks/useSort'
import { EmptyState } from '@/components/layout/EmptyState'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import type { RechnungListeZeile, RechnungStatus } from '@/lib/types'
import { FilterChips } from '@/components/ui/FilterChips'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDatum, formatPreis, cn } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
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
  if (Array.isArray(k)) return k[0]?.name ?? null
  return k.name ?? null
}

function auftragTitel(r: RechnungListeZeile): string | null {
  const a = r.auftraege
  if (!a) return null
  if (Array.isArray(a)) return a[0]?.titel ?? null
  return a.titel ?? null
}

function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-').map((x) => parseInt(x, 10))
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date(NaN)
  return new Date(p[0], p[1] - 1, p[2])
}

function isUeberfaellig(r: RechnungListeZeile): boolean {
  if (r.status !== 'gesendet' || !r.faellig_am) return false
  const due = parseYmdLocal(r.faellig_am)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function displayStatusLabel(r: RechnungListeZeile): string {
  if (isUeberfaellig(r)) return 'Überfällig'
  return RECHNUNG_STATUS_LABELS[r.status]
}

function statusBadgeClass(r: RechnungListeZeile) {
  if (r.status === 'storniert') return 'bg-red-100 text-red-900'
  if (r.status === 'bezahlt') return 'bg-emerald-100 text-emerald-900'
  if (isUeberfaellig(r)) return 'bg-red-200 text-red-950 font-semibold'
  if (r.status === 'gesendet') return 'bg-blue-100 text-blue-900'
  return 'bg-bw-hover text-bw-text'
}

type RechnungChip = 'alle' | RechnungStatus | 'ueberfaellig'

const RECHNUNG_GRID_COLS =
  'minmax(108px,1fr) minmax(160px,1.5fr) minmax(96px,0.85fr) minmax(108px,0.95fr) minmax(96px,0.85fr) minmax(96px,0.85fr)'

type RechnungSortRow = {
  rechnungsnummer: string
  kunde: string
  brutto: number
  status: string
  rechnungsdatum: string
  faellig_am: string
}

function rechnungListCardBadge(r: RechnungListeZeile) {
  if (isUeberfaellig(r)) {
    return <StatusBadge status="cancel" label="Überfällig" />
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
  const [chip, setChip] = useState<RechnungChip>('alle')
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const statusCounts = useMemo(() => {
    const c = {
      alle: rows.length,
      entwurf: 0,
      gesendet: 0,
      bezahlt: 0,
      ueberfaellig: 0,
      storniert: 0,
    }
    for (const r of rows) {
      if (r.status === 'storniert') {
        c.storniert++
        continue
      }
      if (r.status === 'bezahlt') {
        c.bezahlt++
        continue
      }
      if (isUeberfaellig(r)) {
        c.ueberfaellig++
        continue
      }
      if (r.status === 'gesendet') c.gesendet++
      else if (r.status === 'entwurf') c.entwurf++
    }
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (chip !== 'alle') {
        if (chip === 'ueberfaellig') {
          if (!isUeberfaellig(r)) return false
        } else if (chip === 'gesendet') {
          if (r.status !== 'gesendet' || isUeberfaellig(r)) return false
        } else if (r.status !== chip) {
          return false
        }
      }
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
  }, [rows, chip, q, dateRange])

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

  const hasFilters = !!(chip !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setChip('alle')
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

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chips={
          <FilterChips
            options={[
              { label: 'Alle', value: 'alle', count: statusCounts.alle },
              { label: 'Entwurf', value: 'entwurf', count: statusCounts.entwurf },
              { label: 'Gesendet', value: 'gesendet', count: statusCounts.gesendet },
              { label: 'Bezahlt', value: 'bezahlt', count: statusCounts.bezahlt },
              { label: 'Überfällig', value: 'ueberfaellig', count: statusCounts.ueberfaellig },
              { label: 'Storniert', value: 'storniert', count: statusCounts.storniert },
            ]}
            selected={[chip]}
            onChange={(vals) => setChip((vals[0] as RechnungChip) || 'alle')}
          />
        }
      >
        <ListFilterBar
          hideToolbarOnMobile
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
          mobileRail={
            <AppListFilterRail
              sort={
                <MobileSortSelect
                  variant="pill"
                  options={[
                    { field: 'rechnungsnummer', label: 'Nummer' },
                    { field: 'kunde', label: 'Kunde' },
                    { field: 'brutto', label: 'Betrag' },
                    { field: 'status', label: 'Status' },
                    { field: 'rechnungsdatum', label: 'Datum' },
                    { field: 'faellig_am', label: 'Fällig' },
                  ]}
                  currentField={field}
                  currentDir={dir}
                  onSort={(f) => (f ? handleSort(f) : resetSort())}
                />
              }
              zeitraumValue={zeitraum}
              onZeitraumChange={setZeitraum}
              onExportClick={() => setExportOpen(true)}
            />
          }
        />
      </ListFilterSection>
      }
    >
      <PageHeader className={cn(isPane ? 'hidden' : 'hidden md:block')} />

      <div className={cn('mb-4 hidden md:block', isPane && 'md:hidden')}>
        <MobileSortSelect
          options={[
            { field: 'rechnungsnummer', label: 'Nummer' },
            { field: 'kunde', label: 'Kunde' },
            { field: 'brutto', label: 'Betrag' },
            { field: 'status', label: 'Status' },
            { field: 'rechnungsdatum', label: 'Datum' },
            { field: 'faellig_am', label: 'Fällig' },
          ]}
          currentField={field}
          currentDir={dir}
          onSort={(f) => (f ? handleSort(f) : resetSort())}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Keine Rechnungen"
          description={
            rows.length === 0
              ? 'Legen Sie eine Rechnung an.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {sorted.map((r) => {
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
          </ListMobileStack>

          <ListGridShell minWidth="820px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div className="list-row-grid head" style={{ gridTemplateColumns: RECHNUNG_GRID_COLS }}>
              <SortableHeader
                label="Nummer"
                field="rechnungsnummer"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <SortableHeader label="Kunde" field="kunde" currentField={field} currentDir={dir} onSort={handleSort} />
              <div className="text-right">
                <SortableHeader label="Betrag" field="brutto" currentField={field} currentDir={dir} onSort={handleSort} />
              </div>
              <SortableHeader label="Status" field="status" currentField={field} currentDir={dir} onSort={handleSort} />
              <SortableHeader
                label="Datum"
                field="rechnungsdatum"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Fällig"
                field="faellig_am"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
            </div>
            {sorted.map((r) => (
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
                <p className="truncate text-[13.5px] font-medium text-bw-link">{r.rechnungsnummer}</p>
                <p className="truncate text-[13px] text-bw-text">{kundenName(r.kunden) ?? '—'}</p>
                <p className="truncate text-right text-[13px] font-medium tabular-nums text-bw-text">
                  {formatPreis(r.brutto)}
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
                <p className="truncate text-[13px] tabular-nums text-bw-text-muted">
                  {formatDatum(r.rechnungsdatum)}
                </p>
                <p className="truncate text-[13px] tabular-nums text-bw-text-muted">
                  {r.faellig_am ? formatDatum(r.faellig_am) : '—'}
                </p>
              </div>
            ))}
          </ListGridShell>
        </>
      )}

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Rechnungen exportieren"
        fields={RECHNUNG_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : rows
          const data = source.map(exportRow)
          const fields = RECHNUNG_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'rechnungen')
        }}
      />
    </EntityListShell>
  )
}
