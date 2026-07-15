'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import { updateRechnungStatus } from '@/app/(dashboard)/rechnungen/actions'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { runDuplicateRechnung } from '@/lib/list-actions'
import {
  MockBtn,
  MockChip,
  MockEmpty,
  MockIcon,
  MockListBar,
  MockModal,
  MockPager,
  MockSortHead,
} from '@/components/mock-ui'
import { RechnungenExportModal } from '@/components/rechnungen/RechnungenExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import type { RechnungListeZeile } from '@/lib/types'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { cn, formatDatum, formatPreis } from '@/lib/utils'
import {
  countRechnungStatusFilters,
  isRechnungUeberfaellig,
  matchesRechnungStatusFilter,
  rechnungDisplayStatusLabel,
  RECHNUNG_STATUS_FILTER_LABELS,
  type RechnungListenStatusFilter,
} from '@/lib/rechnungen/rechnung-liste-helpers'
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

/** Chips wie Mock: Alle, Gesendet, Bezahlt, Überfällig */
const RECHNUNG_CHIP_FILTERS: RechnungListenStatusFilter[] = [
  '',
  'gesendet',
  'bezahlt',
  'ueberfaellig',
]

const RECHNUNG_ROW_GRID =
  'minmax(140px,1.4fr) minmax(120px,1.2fr) 100px 100px 100px 120px 40px'

type SortCol = 'kunde' | 'rechnung' | 'betrag' | 'faellig' | 'datum' | 'status'

function kundenName(k: RechnungListeZeile['kunden']): string {
  if (!k) return '—'
  const row = Array.isArray(k) ? k[0] : k
  if (!row) return '—'
  const display = kundeDisplayName(row)
  return display !== '—' ? display : '—'
}

function auftragTitel(r: RechnungListeZeile): string {
  const a = r.auftraege
  if (!a) return ''
  if (Array.isArray(a)) return a[0]?.titel ?? ''
  return a.titel ?? ''
}

function rechnungTitel(r: RechnungListeZeile): string {
  const auftrag = auftragTitel(r)
  return auftrag || r.rechnungsnummer
}

function displayStatusLabel(r: RechnungListeZeile): string {
  return rechnungDisplayStatusLabel(r)
}

function statusKind(r: RechnungListeZeile): string {
  if (r.status === 'storniert') return 'storniert'
  if (r.status === 'bezahlt') return 'fertig'
  if (isRechnungUeberfaellig(r)) return 'storniert'
  if (r.status === 'gesendet') return 'warten'
  if (r.status === 'entwurf') return 'neu'
  return 'aktiv'
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
  const isPane = mode === 'pane'

  const [statusFilter, setStatusFilter] = useState<RechnungListenStatusFilter>('')
  const [query, setQuery] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [fKunde, setFKunde] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [exportOpen, setExportOpen] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol | null>('datum')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const statusCounts = useMemo(
    () => countRechnungStatusFilters(rows, RECHNUNG_CHIP_FILTERS),
    [rows]
  )

  const activeFilterCount =
    (statusFilter !== '' ? 1 : 0) +
    (query ? 1 : 0) +
    (fKunde ? 1 : 0) +
    (zeitraum !== 'alle' ? 1 : 0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (!matchesRechnungStatusFilter(r, statusFilter)) return false
      if (dateRange && !datumInZeitraum(r.rechnungsdatum, dateRange)) return false
      if (fKunde && !kundenName(r.kunden).toLowerCase().includes(fKunde.toLowerCase())) return false
      if (!needle) return true
      const pool = [
        r.rechnungsnummer,
        kundenName(r.kunden),
        auftragTitel(r),
        displayStatusLabel(r),
      ]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [rows, statusFilter, query, dateRange, fKunde])

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
    const keyFn = (r: RechnungListeZeile): string | number => {
      switch (sortCol) {
        case 'kunde':
          return kundenName(r.kunden).toLowerCase()
        case 'rechnung':
          return rechnungTitel(r).toLowerCase()
        case 'betrag':
          return r.brutto ?? 0
        case 'faellig':
          return r.faellig_am ?? ''
        case 'datum':
          return r.rechnungsdatum ?? ''
        case 'status':
          return displayStatusLabel(r).toLowerCase()
        default:
          return r.rechnungsdatum ?? ''
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

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const paginationResetKey = `${statusFilter}|${query}|${fKunde}|${zeitraum}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    sorted,
    12,
    paginationResetKey
  )

  function resetFilters() {
    setStatusFilter('')
    setQuery('')
    setFKunde('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  function exportRow(r: RechnungListeZeile): Record<string, unknown> {
    return {
      rechnungsnummer: r.rechnungsnummer,
      kunde: kundenName(r.kunden),
      brutto: r.brutto,
      status: displayStatusLabel(r),
      rechnungsdatum: r.rechnungsdatum,
      faellig_am: r.faellig_am ?? '',
      auftrag: auftragTitel(r),
    }
  }

  function openDetail(id: string) {
    router.push(`/rechnungen/${id}`)
  }

  const rowGrid = (selectMode ? '40px ' : '') + RECHNUNG_ROW_GRID

  return (
    <div>
      <MockListBar
        chips={
          <>
            {RECHNUNG_CHIP_FILTERS.map((key) => (
              <MockChip
                key={key || 'alle'}
                active={statusFilter === key}
                count={statusCounts[key]}
                onClick={() => setStatusFilter(key)}
              >
                {RECHNUNG_STATUS_FILTER_LABELS[key]}
              </MockChip>
            ))}
          </>
        }
        activeFilterCount={activeFilterCount}
        selectMode={selectMode}
        selectedCount={selectedCount}
        onFilterClick={() => setFilterOpen(true)}
        onSelectClick={() => {
          setSelectMode((m) => !m)
          setSelected({})
        }}
        onExportClick={() => setExportOpen(true)}
      />

      <MockModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        icon="filter"
        title="Filter & Suchen"
        sub="Rechnungen eingrenzen"
        footer={
          <>
            <MockBtn kind="ghost" onClick={resetFilters}>
              Zurücksetzen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn kind="primary" onClick={() => setFilterOpen(false)}>
              Anwenden ({filtered.length})
            </MockBtn>
          </>
        }
      >
        <div className="form-section-h">Suche</div>
        <div className="input" style={{ marginBottom: 16 }}>
          <MockIcon n="search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nummer, Kunde, Auftrag…"
            autoFocus
          />
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label className="field">
            <span className="field-lbl">Kunde</span>
            <input
              className="txt"
              value={fKunde}
              onChange={(e) => setFKunde(e.target.value)}
              placeholder="Name enthält…"
            />
          </label>
        </div>
        <div className="form-section-h">Status</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {RECHNUNG_CHIP_FILTERS.map((key) => (
            <MockChip key={key || 'alle'} active={statusFilter === key} onClick={() => setStatusFilter(key)}>
              {RECHNUNG_STATUS_FILTER_LABELS[key]}
            </MockChip>
          ))}
        </div>
        <div className="form-section-h">Zeitraum (Rechnungsdatum)</div>
        <div className="chiprow">
          {(['alle', 'heute', 'diese_woche', 'dieser_monat'] as ZeitraumPreset[]).map((z) => (
            <MockChip key={z} active={zeitraum === z} onClick={() => setZeitraum(z)}>
              {zeitraumLabel(z)}
            </MockChip>
          ))}
        </div>
      </MockModal>

      <div className={cn('listcard', selectMode && 'vg-selectmode')}>
        <div className="list-row head" style={{ gridTemplateColumns: rowGrid }}>
          {selectMode ? (
            <div
              className="vg-check"
              onClick={(e) => {
                e.stopPropagation()
                const allOn = filtered.length > 0 && filtered.every((r) => selected[r.id])
                if (allOn) setSelected({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((r) => {
                    n[r.id] = true
                  })
                  setSelected(n)
                }
              }}
            >
              <span
                className={cn(
                  'vg-box',
                  filtered.length > 0 && filtered.every((r) => selected[r.id]) && 'on'
                )}
              >
                {filtered.length > 0 && filtered.every((r) => selected[r.id]) ? (
                  <MockIcon n="check" size={12} />
                ) : null}
              </span>
            </div>
          ) : null}
          <MockSortHead col="kunde" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Kunde
          </MockSortHead>
          <MockSortHead
            col="rechnung"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Rechnung
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
            col="faellig"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Fällig
          </MockSortHead>
          <MockSortHead col="datum" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Datum
          </MockSortHead>
          <MockSortHead col="status" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Status
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="receipt"
            title={rows.length === 0 ? 'Keine Rechnungen' : 'Keine Treffer'}
            hint={
              rows.length === 0
                ? 'Legen Sie eine Rechnung aus einem Auftrag an.'
                : 'Filter zurücksetzen oder Suche anpassen'
            }
          />
        ) : (
          pageItems.map((r) => {
            const mahn = mahnstufeListenLabel(r)
            const kind = statusKind(r)
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'list-row',
                  selected[r.id] && 'sel',
                  selectedId === r.id && isPane && 'active',
                  selectedId === r.id && isPane && 'ring-2 ring-[var(--green)]'
                )}
                style={{ gridTemplateColumns: rowGrid }}
                onClick={() => (selectMode ? toggleSel(r.id) : openDetail(r.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectMode ? toggleSel(r.id) : openDetail(r.id)
                  }
                }}
              >
                {selectMode ? (
                  <div
                    className="vg-check"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSel(r.id)
                    }}
                  >
                    <span className={cn('vg-box', selected[r.id] && 'on')}>
                      {selected[r.id] ? <MockIcon n="check" size={12} /> : null}
                    </span>
                  </div>
                ) : null}
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {kundenName(r.kunden)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                    {r.rechnungsnummer}
                  </div>
                  {auftragTitel(r) ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {auftragTitel(r)}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatPreis(r.brutto)}
                </div>
                <div style={{ fontSize: 12.5, color: isRechnungUeberfaellig(r) ? 'var(--red-tx)' : 'var(--text-2)' }}>
                  {r.faellig_am ? formatDatum(r.faellig_am) : '—'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {formatDatum(r.rechnungsdatum)}
                </div>
                <div className="lc-status">
                  <span className={cn('st-dot', `st-${kind}`)}>
                    <span className="d" />
                    {displayStatusLabel(r)}
                  </span>
                  {mahn && !isRechnungUeberfaellig(r) ? (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 2,
                        fontSize: 11,
                        color: 'var(--yel-tx)',
                      }}
                    >
                      {mahn}
                    </span>
                  ) : null}
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
                      'rechnung',
                      {
                        titel: r.rechnungsnummer ?? 'Rechnung',
                        name: r.kunden
                          ? kundeDisplayName(
                              Array.isArray(r.kunden) ? r.kunden[0] : r.kunden
                            )
                          : '—',
                        status: r.status,
                      },
                      {
                        onEdit: () => openDetail(r.id),
                        onCopy: () => runDuplicateRechnung(r.id, router),
                        onPdf: () => window.open(`/api/rechnungen/${r.id}/pdf`, '_blank'),
                        onSend: () => openDetail(r.id),
                        onMarkPaid:
                          r.status !== 'bezahlt' && r.status !== 'storniert'
                            ? () => {
                                void updateRechnungStatus(r.id, 'bezahlt').then((res) => {
                                  if (!res.ok) toast.error(res.message)
                                  else {
                                    toast.success('Als bezahlt markiert')
                                    router.refresh()
                                  }
                                })
                              }
                            : undefined,
                        onDelete:
                          r.status !== 'storniert'
                            ? () => {
                                void updateRechnungStatus(r.id, 'storniert').then((res) => {
                                  if (!res.ok) toast.error(res.message)
                                  else {
                                    toast.success('Rechnung storniert')
                                    router.refresh()
                                  }
                                })
                              }
                            : undefined,
                        deleteLabel: r.rechnungsnummer ?? 'Rechnung',
                      }
                    )}
                    sheetTitle="Rechnung"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      <MockPager
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        unit="Rechnungen"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

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
    </div>
  )
}
