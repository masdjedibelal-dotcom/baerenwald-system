'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MockBadge,
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
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import { toast } from '@/components/ui/app-toast'
import { PHASE_LABELS, PHASE_UNTERSTATUS_VALUES, unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
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

function statusKind(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return 'warten'
  const u = row.unterstatus.toLowerCase()
  if (u === 'storniert' || u === 'abgebrochen' || u === 'abgelehnt') return 'storniert'
  if (u === 'bezahlt' || u === 'abgeschlossen' || u === 'angenommen') return 'fertig'
  if (u === 'neu' || u === 'entwurf' || u === 'offen') return 'neu'
  if (u === 'gesendet' || u === 'abnahme' || u === 'kontaktiert' || u === 'termin') return 'warten'
  return 'aktiv'
}

function statusLabel(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return 'Wartet auf Freigabe'
  return row.unterstatusLabel
}

function dateKey(row: VorgangListeRow): string {
  return row.updatedAt.replace(/\D/g, '')
}

/** Parse Anzeige „1.234 €“ → Euro-Zahl für Wert-Filter/Sort. */
function wertEuro(row: VorgangListeRow): number | null {
  if (!row.wertLabel) return null
  const n = Number(
    row.wertLabel
      .replace(/\s/g, '')
      .replace(/€/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  )
  return Number.isFinite(n) ? n : null
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
  restrictHandwerkerId,
  restrictKundeId,
  restrictLeadIds,
}: {
  rows: VorgangListeRow[]
  embedded?: boolean
  restrictPartnerName?: string
  /** Nur Vorgänge, in denen dieser Handwerker vorkommt (Mock `restrictHandwerker`). */
  restrictHandwerkerId?: string
  /** Nur Vorgänge dieses Kunden (Mock `restrictKunde`). */
  restrictKundeId?: string
  /** Alternative: auf Lead-IDs einschränken (z. B. Melder + Auftraggeber). */
  restrictLeadIds?: string[]
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
      params.delete('phase')
      if (phase === 'alle') {
        params.delete('tab')
      } else {
        params.set('tab', phase)
      }
      const qs = params.toString()
      router.replace(qs ? `/vorgaenge?${qs}` : '/vorgaenge', { scroll: false })
    },
    [router, searchParams]
  )

  const setPhaseFilter = useCallback(
    (phase: (typeof VORGANG_PHASES)[number]) => {
      setFilter(phase)
      setStatusFilter([])
      if (!embedded) syncPhaseToUrl(phase)
    },
    [embedded, syncPhaseToUrl]
  )

  useEffect(() => {
    if (embedded) return
    const tab = searchParams.get('tab') ?? searchParams.get('phase')
    if (isVorgangPhase(tab)) {
      setFilter(tab)
    } else if (!tab) {
      setFilter('alle')
    }
  }, [embedded, searchParams])

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
    let next = rows
    if (restrictPartnerName?.trim()) {
      next = filterVorgaengeByPartnerName(next, restrictPartnerName)
    }
    const hwId = restrictHandwerkerId?.trim()
    if (hwId) {
      next = next.filter((r) => (r.handwerkerIds ?? []).includes(hwId))
    }
    const leadIds =
      restrictLeadIds && restrictLeadIds.length > 0 ? new Set(restrictLeadIds) : null
    const kundeId = restrictKundeId?.trim() || null
    if (leadIds || kundeId) {
      next = next.filter(
        (r) => (kundeId != null && r.kundeId === kundeId) || (leadIds != null && leadIds.has(r.leadId))
      )
    }
    return next
  }, [rows, restrictPartnerName, restrictHandwerkerId, restrictKundeId, restrictLeadIds])

  const statusOptions = useMemo(() => {
    // Nr. 9b: Status-Chips aus Resolver-Unterstatus (inkl. Angebot-Fine-Stages)
    if (filter !== 'alle' && filter in PHASE_UNTERSTATUS_VALUES) {
      const phase = filter as VorgangPhase
      return PHASE_UNTERSTATUS_VALUES[phase].map((u) => ({
        value: u,
        label: unterstatusLabel(phase, u),
      }))
    }
    const byKey = new Map<string, string>()
    for (const v of baseRows) {
      if (!byKey.has(v.unterstatus)) byKey.set(v.unterstatus, v.unterstatusLabel)
    }
    return Array.from(byKey.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'de'))
      .map(([value, label]) => ({ value, label }))
  }, [baseRows, filter])

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
      if (statusFilter.length && !statusFilter.includes(v.unterstatus)) return false
      if (
        query &&
        !(v.titel + ' ' + (v.kundeName ?? '') + ' ' + v.entityId)
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false
      }
      if (fKunde && !(v.kundeName ?? '').toLowerCase().includes(fKunde.toLowerCase())) return false
      if (fTitel && !v.titel.toLowerCase().includes(fTitel.toLowerCase())) return false
      const euro = wertEuro(v)
      if (fWertVon) {
        const min = Number(fWertVon)
        if (Number.isFinite(min) && (euro == null || euro < min)) return false
      }
      if (fWertBis) {
        const max = Number(fWertBis)
        if (Number.isFinite(max) && (euro == null || euro > max)) return false
      }
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
    fWertVon,
    fWertBis,
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
      wert: (v) => wertEuro(v) ?? -1,
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

  const selectedRows = useMemo(
    () => filtered.filter((v) => selected[rowKey(v)]),
    [filtered, selected]
  )

  const bulkExport = useCallback(() => {
    runMockListExport(
      exportToCSV,
      selectedRows.map(toExportRow),
      EXPORT_FIELDS,
      'vorgaenge-auswahl'
    )
  }, [exportToCSV, selectedRows])

  const bulkDelete = useCallback(() => {
    const leadIds = Array.from(new Set(selectedRows.map((v) => v.leadId)))
    if (!leadIds.length) return
    void (async () => {
      const loadingId = toast.loading(
        leadIds.length === 1
          ? 'Vorgang wird gelöscht…'
          : `${leadIds.length} Vorgänge werden gelöscht…`
      )
      let ok = 0
      let fail = 0
      for (const leadId of leadIds) {
        const r = await deleteVorgang(leadId)
        if (r.ok) ok += 1
        else fail += 1
      }
      setSelected({})
      if (fail === 0) {
        toast.success(
          ok === 1 ? 'Vorgang gelöscht' : `${ok} Vorgänge gelöscht`,
          { id: loadingId }
        )
      } else {
        toast.error(
          `${ok} gelöscht, ${fail} fehlgeschlagen`,
          { id: loadingId }
        )
      }
      router.refresh()
    })()
  }, [router, selectedRows])

  const bulkOpen = useCallback(() => {
    const row = selectedRows[0]
    if (row) router.push(row.detailHref)
  }, [router, selectedRows])

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
        onPdf: isAngebot
          ? () => window.open(`/api/angebote/${v.entityId}/pdf`, '_blank')
          : isRechnung
            ? () => window.open(`/api/rechnungen/${v.entityId}/pdf`, '_blank')
            : undefined,
        onDelete: () => runDeleteVorgang(v.leadId, router),
        deleteLabel: v.titel,
      })
    },
    [router]
  )

  return (
    <div>
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
                (filtered.length ? filtered : baseRows).map(toExportRow),
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
          <MockIcon ctx="default" n="search" />
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
              key={s.value}
              active={statusFilter.includes(s.value)}
              onClick={() =>
                setStatusFilter((f) =>
                  f.includes(s.value) ? f.filter((x) => x !== s.value) : [...f, s.value]
                )
              }
            >
              {s.label}
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

      {selectMode && selectedCount > 0 ? (
        <div className="bulkbar">
          <span>
            <b>{selectedCount}</b> ausgewählt
          </span>
          <div style={{ flex: 1 }} />
          {selectedCount === 1 ? (
            <MockBtn kind="ghost" sm icon="external-link" onClick={bulkOpen}>
              Öffnen
            </MockBtn>
          ) : null}
          <MockBtn kind="ghost" sm icon="download" onClick={bulkExport}>
            Export
          </MockBtn>
          <MockBtn kind="danger" sm icon="trash" onClick={bulkDelete}>
            Löschen
          </MockBtn>
          <MockBtn
            kind="ghost"
            sm
            className="qa-btn"
            icon="x"
            onClick={() => setSelected({})}
            title="Auswahl aufheben"
          />
        </div>
      ) : null}

      <div className={cn('listcard', selectMode && 'vg-selectmode')}>
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
                  <MockIcon ctx="default" n="check" size={12} />
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
            const kind = statusKind(v)
            const label = statusLabel(v)
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
                      {selected[key] ? <MockIcon ctx="default" n="check" size={12} /> : null}
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
                    <MockIcon ctx="default" n={PHASE_META[v.phase].icon} size={13} />
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
                  <MockBadge kind={kind}>{label}</MockBadge>
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
        pageSize={pageSize}
        unit="Vorgänge"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

    </div>
  )
}
