'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MockBtn,
  MockChip,
  MockEmpty,
  MockEntityRowMenu,
  MockIcon,
  MockModal,
  MockPager,
  MockSortHead,
} from '@/components/mock-ui'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { buildEntityMenu } from '@/lib/entity-menu'
import { runMockListExport } from '@/lib/mock-list-export'
import { filterVorgaengeByPartnerName } from '@/lib/vorgang/filter-vorgaenge-by-partner-name'
import {
  runDeleteVorgang,
  runDuplicateAnfrage,
  runDuplicateAngebot,
  runDuplicateAuftrag,
  runDuplicateRechnung,
} from '@/lib/list-actions'
import { PHASE_LABELS } from '@/lib/vorgang/vorgang-labels'
import type { VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'
import { cn, formatDatum } from '@/lib/utils'

const VORGANG_PHASES = ['alle', 'anfrage', 'angebot', 'auftrag', 'rechnung'] as const

const PHASE_META: Record<
  VorgangPhase,
  { label: string; icon: string }
> = {
  anfrage: { label: 'Anfrage', icon: 'inbox' },
  angebot: { label: 'Angebot', icon: 'file-invoice' },
  auftrag: { label: 'Auftrag', icon: 'briefcase' },
  rechnung: { label: 'Rechnung', icon: 'receipt' },
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'kunde', label: 'Kunde' },
  { key: 'titel', label: 'Vorgang' },
  { key: 'phase', label: 'Phase' },
  { key: 'unterstatus', label: 'Status' },
  { key: 'wert', label: 'Wert' },
  { key: 'kanal', label: 'Kanal' },
  { key: 'updated_at', label: 'Aktualisiert' },
]

type SortCol = 'kunde' | 'titel' | 'phase' | 'wert' | 'datum' | 'status'

function statusKind(phase: VorgangPhase, unterstatus: string): string {
  const u = unterstatus.toLowerCase()
  if (u === 'storniert' || u === 'abgebrochen' || u === 'abgelehnt') return 'storniert'
  if (u === 'bezahlt' || u === 'abgeschlossen' || u === 'angenommen') return 'fertig'
  if (u === 'neu' || u === 'entwurf' || u === 'offen') return 'neu'
  if (u === 'gesendet' || u === 'abnahme' || u === 'kontaktiert' || u === 'termin') return 'warten'
  return 'aktiv'
}

function dateKey(row: VorgangListeRow): string {
  return row.updatedAt.replace(/\D/g, '')
}

function toExportRow(row: VorgangListeRow): Record<string, unknown> {
  return {
    kunde: row.kundeName ?? '',
    titel: row.titel,
    phase: PHASE_LABELS[row.phase],
    unterstatus: row.unterstatusLabel,
    wert: row.wertLabel ?? '',
    kanal: row.kanalMeta ?? '',
    updated_at: row.updatedAt,
  }
}

function isVorgangPhase(value: string | null): value is (typeof VORGANG_PHASES)[number] {
  return value != null && (VORGANG_PHASES as readonly string[]).includes(value)
}

export function VorgaengeListeClient({
  rows,
  embedded = false,
  restrictPartnerName,
}: {
  rows: VorgangListeRow[]
  embedded?: boolean
  restrictPartnerName?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof VORGANG_PHASES)[number]>('alle')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [fKunde, setFKunde] = useState('')
  const [fTitel, setFTitel] = useState('')
  const [fWertVon, setFWertVon] = useState('')
  const [fWertBis, setFWertBis] = useState('')
  const [fDatumVon, setFDatumVon] = useState('')
  const [fDatumBis, setFDatumBis] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('datum')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const syncPhaseToUrl = useCallback(
    (phase: (typeof VORGANG_PHASES)[number]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (phase === 'alle') {
        params.delete('phase')
      } else {
        params.set('phase', phase)
      }
      const qs = params.toString()
      router.replace(qs ? `/vorgaenge?${qs}` : '/vorgaenge', { scroll: false })
    },
    [router, searchParams]
  )

  const setPhaseFilter = useCallback(
    (phase: (typeof VORGANG_PHASES)[number]) => {
      setFilter(phase)
      syncPhaseToUrl(phase)
    },
    [syncPhaseToUrl]
  )

  useEffect(() => {
    const phase = searchParams.get('phase')
    if (isVorgangPhase(phase)) {
      setFilter(phase)
    } else if (!phase) {
      setFilter('alle')
    }
  }, [searchParams])

  const rowKey = (row: VorgangListeRow) => `${row.phase}:${row.entityId}`

  const resetFilters = () => {
    setPhaseFilter('alle')
    setStatusFilter([])
    setQuery('')
    setFKunde('')
    setFTitel('')
    setFWertVon('')
    setFWertBis('')
    setFDatumVon('')
    setFDatumBis('')
  }

  const activeFilterCount =
    (filter !== 'alle' ? 1 : 0) +
    statusFilter.length +
    (query ? 1 : 0) +
    (fKunde ? 1 : 0) +
    (fTitel ? 1 : 0) +
    (fWertVon ? 1 : 0) +
    (fWertBis ? 1 : 0) +
    (fDatumVon ? 1 : 0) +
    (fDatumBis ? 1 : 0)

  const baseRows = useMemo(() => {
    if (!restrictPartnerName?.trim()) return rows
    return filterVorgaengeByPartnerName(rows, restrictPartnerName)
  }, [rows, restrictPartnerName])

  const statusOptions = useMemo(() => {
    const s = new Set<string>()
    baseRows.forEach((v) => s.add(v.unterstatusLabel))
    return Array.from(s).sort()
  }, [baseRows])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of VORGANG_PHASES) {
      c[p] = p === 'alle' ? baseRows.length : baseRows.filter((v) => v.phase === p).length
    }
    return c
  }, [baseRows])

  const filteredBase = useMemo(() => {
    return baseRows.filter((v) => {
      if (filter !== 'alle' && v.phase !== filter) return false
      if (statusFilter.length && !statusFilter.includes(v.unterstatusLabel)) return false
      if (
        query &&
        !(v.titel + ' ' + (v.kundeName ?? '') + ' ' + v.entityId + ' ' + (v.kanalMeta ?? ''))
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false
      }
      if (fKunde && !(v.kundeName ?? '').toLowerCase().includes(fKunde.toLowerCase())) return false
      if (fTitel && !v.titel.toLowerCase().includes(fTitel.toLowerCase())) return false
      if (fDatumVon && dateKey(v) < fDatumVon.replace(/-/g, '')) return false
      if (fDatumBis && dateKey(v) > fDatumBis.replace(/-/g, '')) return false
      return true
    })
  }, [
    baseRows,
    filter,
    statusFilter,
    query,
    fKunde,
    fTitel,
    fDatumVon,
    fDatumBis,
  ])

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

  const filtered = useMemo(() => {
    const sortKeys: Record<SortCol, (v: VorgangListeRow) => string | number> = {
      kunde: (v) => (v.kundeName ?? '').toLowerCase(),
      titel: (v) => v.titel.toLowerCase(),
      phase: (v) => PHASE_META[v.phase].label.toLowerCase(),
      wert: (v) => 0,
      datum: (v) => dateKey(v),
      status: (v) => v.unterstatusLabel.toLowerCase(),
    }

    if (!sortCol) return filteredBase
    const fn = sortKeys[sortCol]
    const dir = sortDir
    return [...filteredBase].sort((a, b) => {
      const av = fn(a)
      const bv = fn(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filteredBase, sortCol, sortDir])

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (key: string) => setSelected((s) => ({ ...s, [key]: !s[key] }))

  const paginationResetKey = `${filter}|${statusFilter.join(',')}|${query}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    12,
    paginationResetKey
  )

  function openDetail(href: string) {
    router.push(href)
  }

  const rowMenuItems = useCallback(
    (v: VorgangListeRow) => {
      const isAnfrage = v.phase === 'anfrage'
      const isAngebot = v.phase === 'angebot'
      const isAuftrag = v.phase === 'auftrag'
      const isRechnung = v.phase === 'rechnung'
      return buildEntityMenu(v.phase, { status: v.unterstatus, titel: v.titel, name: v.kundeName }, {
        onEdit: () => openDetail(v.detailHref),
        onCopy: () => {
          if (isAnfrage) runDuplicateAnfrage(v.leadId, router)
          else if (isAngebot) runDuplicateAngebot(v.entityId, router)
          else if (isAuftrag) runDuplicateAuftrag(v.entityId, router)
          else if (isRechnung) runDuplicateRechnung(v.entityId, router)
        },
        onAngebot: isAnfrage ? () => router.push(`/anfragen/${v.leadId}`) : undefined,
        onAccept: isAngebot ? () => router.push(v.detailHref) : undefined,
        onComplete: isAuftrag ? () => router.push(v.detailHref) : undefined,
        onMarkPaid: isRechnung ? () => router.push(v.detailHref) : undefined,
        onPdf: isAngebot
          ? () => window.open(`/api/angebote/${v.entityId}/pdf`, '_blank')
          : isRechnung
            ? () => window.open(`/api/rechnungen/${v.entityId}/pdf`, '_blank')
            : undefined,
        onSend: isAngebot || isRechnung ? () => router.push(v.detailHref) : undefined,
        onInvoice: isAuftrag ? () => router.push(`/rechnungen/neu?auftrag=${v.entityId}`) : undefined,
        onDelete: () => runDeleteVorgang(v.leadId, router),
        deleteLabel: v.titel,
      })
    },
    [router]
  )

  return (
    <div>
      {!embedded ? (
      <>
      <div className="listbar">
        <div className="listbar-chips">
          {VORGANG_PHASES.map((p) => (
            <MockChip
              key={p}
              active={filter === p}
              onClick={() => setPhaseFilter(p)}
              count={counts[p]}
              icon={p !== 'alle' ? PHASE_META[p as VorgangPhase].icon : undefined}
            >
              {p === 'alle' ? 'Alle' : PHASE_META[p as VorgangPhase].label}
            </MockChip>
          ))}
        </div>
        <div className="listbar-actions">
          <MockBtn
            icon="filter"
            kind={activeFilterCount ? 'primary' : 'ghost'}
            sm
            onClick={() => setFilterOpen(true)}
          >
            <span className="listbar-btn-label">
              Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </span>
          </MockBtn>
          <MockBtn
            icon="checks"
            kind={selectMode ? 'primary' : 'ghost'}
            sm
            onClick={() => {
              setSelectMode((m) => !m)
              setSelected({})
            }}
          >
            <span className="listbar-btn-label">
              {selectMode ? `Auswahl (${selectedCount})` : 'Auswählen'}
            </span>
          </MockBtn>
          <MockBtn
            icon="download"
            kind="ghost"
            sm
            onClick={() =>
              runMockListExport(
                exportToCSV,
                (filtered.length ? filtered : rows).map(toExportRow),
                EXPORT_FIELDS,
                'vorgaenge'
              )
            }
          >
            <span className="listbar-btn-label">Export</span>
          </MockBtn>
        </div>
      </div>

      <MockModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        icon="filter"
        title="Filter & Suchen"
        sub="Vorgänge eingrenzen"
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
            placeholder="Kunde, Vorgang, Ort, Nummer…"
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
          <label className="field">
            <span className="field-lbl">Vorgang</span>
            <input
              className="txt"
              value={fTitel}
              onChange={(e) => setFTitel(e.target.value)}
              placeholder="Titel enthält…"
            />
          </label>
        </div>
        <div className="form-section-h">Phase</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {VORGANG_PHASES.map((p) => (
            <MockChip
              key={p}
              active={filter === p}
              onClick={() => setPhaseFilter(p)}
              icon={p !== 'alle' ? PHASE_META[p as VorgangPhase].icon : undefined}
            >
              {p === 'alle' ? 'Alle' : PHASE_META[p as VorgangPhase].label}
            </MockChip>
          ))}
        </div>
        <div className="form-section-h">Status</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {statusOptions.map((s) => (
            <MockChip
              key={s}
              active={statusFilter.includes(s)}
              onClick={() =>
                setStatusFilter((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]))
              }
            >
              {s}
            </MockChip>
          ))}
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label className="field">
            <span className="field-lbl">Wert von (€)</span>
            <input
              className="txt"
              type="number"
              value={fWertVon}
              onChange={(e) => setFWertVon(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field">
            <span className="field-lbl">Wert bis (€)</span>
            <input
              className="txt"
              type="number"
              value={fWertBis}
              onChange={(e) => setFWertBis(e.target.value)}
              placeholder="—"
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-lbl">Datum von</span>
            <input
              className="txt"
              type="date"
              value={fDatumVon}
              onChange={(e) => setFDatumVon(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-lbl">Datum bis</span>
            <input
              className="txt"
              type="date"
              value={fDatumBis}
              onChange={(e) => setFDatumBis(e.target.value)}
            />
          </label>
        </div>
      </MockModal>
      </>
      ) : null}

      <div className={cn('listcard', selectMode && !embedded && 'vg-selectmode')}>
        <div className="vg-row head">
          {selectMode ? (
            <div
              className="vg-check"
              onClick={(e) => {
                e.stopPropagation()
                const allOn = filtered.length > 0 && filtered.every((v) => selected[rowKey(v)])
                if (allOn) setSelected({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((v) => {
                    n[rowKey(v)] = true
                  })
                  setSelected(n)
                }
              }}
            >
              <span
                className={cn(
                  'vg-box',
                  filtered.length > 0 && filtered.every((v) => selected[rowKey(v)]) && 'on'
                )}
              >
                {filtered.length > 0 && filtered.every((v) => selected[rowKey(v)]) ? (
                  <MockIcon n="check" size={12} />
                ) : null}
              </span>
            </div>
          ) : null}
          <MockSortHead col="kunde" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Kunde
          </MockSortHead>
          <MockSortHead col="titel" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Vorgang
          </MockSortHead>
          <MockSortHead col="phase" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Phase
          </MockSortHead>
          <MockSortHead col="wert" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)} right>
            Wert
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
            icon="folder-open"
            title="Keine Vorgänge"
            hint="Filter zurücksetzen oder neuen Vorgang anlegen"
          />
        ) : (
          pageItems.map((v) => {
            const key = rowKey(v)
            const kind = statusKind(v.phase, v.unterstatus)
            return (
              <div
                key={key}
                className={cn('vg-row', selected[key] && 'sel')}
                onClick={() => (selectMode ? toggleSel(key) : openDetail(v.detailHref))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectMode ? toggleSel(key) : openDetail(v.detailHref)
                  }
                }}
              >
                {selectMode ? (
                  <div
                    className="vg-check"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSel(key)
                    }}
                  >
                    <span className={cn('vg-box', selected[key] && 'on')}>
                      {selected[key] ? <MockIcon n="check" size={12} /> : null}
                    </span>
                  </div>
                ) : null}
                <div className="vg-kunde">
                  <span>{v.kundeName ?? '—'}</span>
                </div>
                <div className="vg-vorgang">
                  <div className="t" title={v.titel}>
                    {v.titel}
                  </div>
                </div>
                <div className="vg-phase">
                  <span className="ph-neutral">
                    <MockIcon n={PHASE_META[v.phase].icon} size={13} />
                    {PHASE_META[v.phase].label}
                  </span>
                </div>
                <div
                  className="vg-wert"
                  style={{
                    textAlign: 'right',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 13,
                  }}
                >
                  {v.wertLabel ?? '—'}
                </div>
                <div className="vg-datum" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {formatDatum(v.updatedAt)}
                </div>
                <div className="vg-status">
                  <span className={cn('st-dot', `st-${kind}`)}>
                    <span className="d" />
                    {v.unterstatusLabel}
                  </span>
                </div>
                <div className="vg-actions" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                  <MockEntityRowMenu items={rowMenuItems(v)} title="Vorgang" />
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
        pageSize={embedded ? 5 : pageSize}
        unit="Vorgänge"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

    </div>
  )
}
