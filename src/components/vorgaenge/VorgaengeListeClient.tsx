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
import { buildListRowMenu } from '@/lib/entity-menu'
import { runMockListExport } from '@/lib/mock-list-export'
import { filterVorgaengeByPartnerName } from '@/lib/vorgang/filter-vorgaenge-by-partner-name'
import {
  runDeleteStandaloneRechnung,
  runDeleteVorgang,
  runDuplicateAnfrage,
  runDuplicateAngebot,
  runDuplicateAuftrag,
  runDuplicateRechnung,
} from '@/lib/list-actions'
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import { deleteRechnungEntwurf } from '@/app/(dashboard)/rechnungen/wizard-actions'
import { fachbegriff } from '@/lib/crm/fachbegriffe'
import { createAnfrageHref } from '@/lib/crm/create-entry'
import { toast } from '@/components/ui/app-toast'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { ListbarActionsMenu } from '@/components/layout/ListbarActionsMenu'
import { useResizableColumns, type ResizableColDef } from '@/hooks/useResizableColumns'
import { PHASE_LABELS, PHASE_UNTERSTATUS_VALUES, unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
import type { VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'
import { cn, formatDatum } from '@/lib/utils'

const VORGANG_FILTERS = ['alle', 'anfrage', 'angebot', 'auftrag', 'bestand', 'rechnung'] as const

const VORGAENGE_COLS: ResizableColDef[] = [
  { id: 'check', defaultWidth: 36, minWidth: 36, maxWidth: 36, fixed: true },
  { id: 'kunde', defaultWidth: 200, minWidth: 140, maxWidth: 420 },
  { id: 'titel', defaultWidth: 200, minWidth: 120, maxWidth: 480 },
  { id: 'phase', defaultWidth: 140, minWidth: 100, maxWidth: 220 },
  { id: 'wert', defaultWidth: 100, minWidth: 72, maxWidth: 160 },
  { id: 'datum', defaultWidth: 110, minWidth: 88, maxWidth: 160 },
  { id: 'status', defaultWidth: 110, minWidth: 88, maxWidth: 180 },
  { id: 'actions', defaultWidth: 40, minWidth: 40, maxWidth: 40, fixed: true },
]

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
  if (
    u === 'storniert' ||
    u === 'abgebrochen' ||
    u === 'abgelehnt' ||
    u === 'abgelaufen' ||
    u === 'ersetzt'
  ) {
    return 'storniert'
  }
  if (u === 'bezahlt' || u === 'abgeschlossen' || u === 'angenommen') return 'fertig'
  if (u === 'neu' || u === 'entwurf' || u === 'offen') return 'neu'
  if (u === 'gesendet' || u === 'abnahme' || u === 'kontaktiert' || u === 'termin') return 'warten'
  return 'aktiv'
}

function statusLabel(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return 'Warte auf HV'
  return row.unterstatusLabel
}

function dateKey(row: VorgangListeRow): string {
  return row.updatedAt.replace(/\D/g, '')
}

/** Abgeschlossen / verloren / storniert → Erledigt-Bucket; sonst Offen. */
function isVorgangErledigt(row: VorgangListeRow): boolean {
  const kind = statusKind(row)
  return kind === 'storniert' || kind === 'fertig'
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

function isVorgangFilter(value: string | null): value is (typeof VORGANG_FILTERS)[number] {
  return value != null && (VORGANG_FILTERS as readonly string[]).includes(value)
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
  const [filter, setFilter] = useState<(typeof VORGANG_FILTERS)[number]>('alle')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [fKunde, setFKunde] = useState('')
  const [fTitel, setFTitel] = useState('')
  const [fWertVon, setFWertVon] = useState('')
  const [fWertBis, setFWertBis] = useState('')
  const [fDatumVon, setFDatumVon] = useState('')
  const [fDatumBis, setFDatumBis] = useState('')
  const [lifecycle, setLifecycle] = useState<'offen' | 'erledigt'>('offen')
  const [lifecycleOpen, setLifecycleOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('datum')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const { gridTemplateColumns, startResize } = useResizableColumns(
    'crm.cols.vorgaenge.v1',
    VORGAENGE_COLS
  )

  useEffect(() => {
    setSelected({})
  }, [lifecycle])

  useEffect(() => {
    if (!selectMode) setSelected({})
  }, [selectMode])

  const syncPhaseToUrl = useCallback(
    (phase: (typeof VORGANG_FILTERS)[number]) => {
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
    (phase: (typeof VORGANG_FILTERS)[number]) => {
      setFilter(phase)
      setStatusFilter([])
      if (!embedded) syncPhaseToUrl(phase)
    },
    [embedded, syncPhaseToUrl]
  )

  useEffect(() => {
    if (embedded) return
    const tab = searchParams.get('tab') ?? searchParams.get('phase')
    if (isVorgangFilter(tab)) {
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

  const lifecycleCounts = useMemo(() => {
    let offen = 0
    let erledigt = 0
    for (const v of baseRows) {
      if (isVorgangErledigt(v)) erledigt += 1
      else offen += 1
    }
    return { offen, erledigt }
  }, [baseRows])

  const lifecycleRows = useMemo(
    () =>
      baseRows.filter((v) =>
        lifecycle === 'erledigt' ? isVorgangErledigt(v) : !isVorgangErledigt(v)
      ),
    [baseRows, lifecycle]
  )

  const statusOptions = useMemo(() => {
    // Nr. 9b: Status-Chips aus Resolver-Unterstatus (inkl. Angebot-Fine-Stages)
    if (filter !== 'alle' && filter !== 'bestand' && filter in PHASE_UNTERSTATUS_VALUES) {
      const phase = filter as VorgangPhase
      return PHASE_UNTERSTATUS_VALUES[phase].map((u) => ({
        value: u,
        label: unterstatusLabel(phase, u),
      }))
    }
    const byKey = new Map<string, string>()
    for (const v of lifecycleRows) {
      if (filter === 'bestand' && !v.ist_wiederkehrend) continue
      if (!byKey.has(v.unterstatus)) byKey.set(v.unterstatus, v.unterstatusLabel)
    }
    return Array.from(byKey.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'de'))
      .map(([value, label]) => ({ value, label }))
  }, [lifecycleRows, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of VORGANG_FILTERS) {
      if (p === 'alle') {
        c[p] = lifecycleRows.length
      } else if (p === 'bestand') {
        c[p] = lifecycleRows.filter((v) => v.ist_wiederkehrend).length
      } else {
        c[p] = lifecycleRows.filter((v) => v.phase === p).length
      }
    }
    return c
  }, [lifecycleRows])

  const filteredBase = useMemo(() => {
    return lifecycleRows.filter((v) => {
      if (filter === 'bestand') {
        if (!v.ist_wiederkehrend) return false
      } else if (filter !== 'alle' && v.phase !== filter) {
        return false
      }
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
    lifecycleRows,
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
    const leadIds = Array.from(
      new Set(selectedRows.filter((v) => !v.standalone && v.leadId).map((v) => v.leadId))
    )
    const standaloneIds = selectedRows
      .filter((v) => v.standalone && v.phase === 'rechnung')
      .map((v) => v.entityId)
    if (!leadIds.length && !standaloneIds.length) return
    void (async () => {
      const total = leadIds.length + standaloneIds.length
      const loadingId = toast.loading(
        total === 1 ? 'Vorgang wird gelöscht…' : `${total} Vorgänge werden gelöscht…`
      )
      let ok = 0
      let fail = 0
      for (const leadId of leadIds) {
        const r = await deleteVorgang(leadId)
        if (r.ok) ok += 1
        else fail += 1
      }
      for (const rechnungId of standaloneIds) {
        const r = await deleteRechnungEntwurf(rechnungId)
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

  const paginationResetKey = `${lifecycle}|${filter}|${statusFilter.join(',')}|${query}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    12,
    paginationResetKey
  )

  function openDetail(href: string) {
    router.push(href)
  }

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((v) => selected[rowKey(v)])
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((v) => selected[rowKey(v)])

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected({})
      return
    }
    const n: Record<string, boolean> = {}
    filtered.forEach((v) => {
      n[rowKey(v)] = true
    })
    setSelected(n)
  }

  const rowMenuItems = useCallback(
    (v: VorgangListeRow) => {
      const isAnfrage = v.phase === 'anfrage'
      const isAngebot = v.phase === 'angebot'
      const isAuftrag = v.phase === 'auftrag'
      const isRechnung = v.phase === 'rechnung'
      return buildListRowMenu(v.phase, { status: v.unterstatus, titel: v.titel, name: v.kundeName }, {
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
        onDelete: () =>
          v.standalone
            ? runDeleteStandaloneRechnung(v.entityId, router, v.titel)
            : runDeleteVorgang(v.leadId, router),
        deleteLabel: v.titel,
      })
    },
    [router]
  )

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips" role="group" aria-label="Phase">
          {VORGANG_FILTERS.map((p) => (
            <MockChip
              key={p}
              active={filter === p}
              onClick={() => setPhaseFilter(p)}
              count={counts[p]}
              title={p === 'bestand' ? fachbegriff('bestand') : undefined}
              icon={
                p === 'bestand'
                  ? 'refresh'
                  : p !== 'alle'
                    ? PHASE_META[p as VorgangPhase].icon
                    : undefined
              }
            >
              {p === 'alle' ? 'Alle' : p === 'bestand' ? 'Bestand' : PHASE_META[p as VorgangPhase].label}
            </MockChip>
          ))}
        </div>
        <ListbarActionsMenu
          title="Listen-Aktionen"
          activeHint={activeFilterCount}
          items={[
            {
              icon: 'filter',
              label: 'Filter & Suchen',
              hint: activeFilterCount ? `${activeFilterCount} aktiv` : undefined,
              active: activeFilterCount > 0,
              onSelect: () => setFilterOpen(true),
            },
            {
              icon: 'refresh',
              label: 'Offen / Erledigt',
              hint:
                lifecycle === 'offen'
                  ? `Offen ${lifecycleCounts.offen}`
                  : `Erledigt ${lifecycleCounts.erledigt}`,
              onSelect: () => setLifecycleOpen(true),
            },
            {
              icon: 'checks',
              label: selectMode ? 'Auswahl beenden' : 'Multiauswahl',
              hint: selectMode ? `${selectedCount} gewählt` : undefined,
              active: selectMode,
              onSelect: () => setSelectMode((m) => !m),
            },
            {
              icon: 'download',
              label: 'CSV exportieren',
              onSelect: () =>
                runMockListExport(
                  exportToCSV,
                  (filtered.length ? filtered : baseRows).map(toExportRow),
                  EXPORT_FIELDS,
                  'vorgaenge'
                ),
            },
          ]}
          desktop={
            <>
              <div className="segment-toggle" role="group" aria-label="Lebenszyklus">
                <button
                  type="button"
                  className={cn(
                    'segment-toggle-btn',
                    lifecycle === 'offen' && 'segment-toggle-btn--active'
                  )}
                  onClick={() => setLifecycle('offen')}
                >
                  Offen {lifecycleCounts.offen}
                </button>
                <button
                  type="button"
                  className={cn(
                    'segment-toggle-btn',
                    lifecycle === 'erledigt' && 'segment-toggle-btn--active'
                  )}
                  onClick={() => setLifecycle('erledigt')}
                >
                  Erledigt {lifecycleCounts.erledigt}
                </button>
              </div>
              <MockBtn
                icon="filter"
                kind={activeFilterCount ? 'primary' : 'ghost'}
                sm
                title={
                  activeFilterCount
                    ? `Filter & Suchen (${activeFilterCount})`
                    : 'Filter & Suchen'
                }
                onClick={() => setFilterOpen(true)}
              />
              <MockBtn
                icon="checks"
                kind={selectMode ? 'primary' : 'ghost'}
                sm
                title={selectMode ? 'Auswahl beenden' : 'Multiauswahl'}
                onClick={() => setSelectMode((m) => !m)}
              />
              <MockBtn
                icon="download"
                kind="ghost"
                sm
                title="CSV exportieren"
                onClick={() =>
                  runMockListExport(
                    exportToCSV,
                    (filtered.length ? filtered : baseRows).map(toExportRow),
                    EXPORT_FIELDS,
                    'vorgaenge'
                  )
                }
              />
            </>
          }
        />
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
          {VORGANG_FILTERS.map((p) => (
            <MockChip
              key={p}
              active={filter === p}
              onClick={() => setPhaseFilter(p)}
              title={p === 'bestand' ? fachbegriff('bestand') : undefined}
              icon={
                p === 'bestand'
                  ? 'refresh'
                  : p !== 'alle'
                    ? PHASE_META[p as VorgangPhase].icon
                    : undefined
              }
            >
              {p === 'alle' ? 'Alle' : p === 'bestand' ? 'Bestand' : PHASE_META[p as VorgangPhase].label}
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

      <MockModal
        open={lifecycleOpen}
        onClose={() => setLifecycleOpen(false)}
        icon="refresh"
        title="Offen / Erledigt"
        sub="Lebenszyklus der Liste"
        size="sm"
        footer={
          <MockBtn kind="primary" onClick={() => setLifecycleOpen(false)}>
            Fertig
          </MockBtn>
        }
      >
        <div className="segment-toggle segment-toggle--stack" role="group" aria-label="Lebenszyklus">
          <button
            type="button"
            className={cn(
              'segment-toggle-btn',
              lifecycle === 'offen' && 'segment-toggle-btn--active'
            )}
            onClick={() => setLifecycle('offen')}
          >
            Offen {lifecycleCounts.offen}
          </button>
          <button
            type="button"
            className={cn(
              'segment-toggle-btn',
              lifecycle === 'erledigt' && 'segment-toggle-btn--active'
            )}
            onClick={() => setLifecycle('erledigt')}
          >
            Erledigt {lifecycleCounts.erledigt}
          </button>
        </div>
      </MockModal>

      {selectedCount > 0 ? (
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

      <PullToRefresh onRefresh={() => router.refresh()}>
      <div
        className={cn('listcard listcard--scroll listcard--cols', selectMode && 'vg-selectmode')}
        style={{ ['--list-cols' as string]: gridTemplateColumns }}
      >
        <div className="vg-row head">
          <div
            className="vg-check"
            onClick={(e) => {
              e.stopPropagation()
              toggleSelectAll()
            }}
            title={allFilteredSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
          >
            <span className={cn('vg-box', allFilteredSelected && 'on', allPageSelected && !allFilteredSelected && 'partial')}>
              {allFilteredSelected || allPageSelected ? (
                <MockIcon ctx="default" n="check" size={12} />
              ) : null}
            </span>
          </div>
          <MockSortHead
            col="kunde"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(1, e)}
          >
            Kunde
          </MockSortHead>
          <MockSortHead
            col="titel"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(2, e)}
          >
            Vorgang
          </MockSortHead>
          <MockSortHead
            col="phase"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(3, e)}
          >
            Phase
          </MockSortHead>
          <MockSortHead
            col="wert"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            right
            resizable
            onResizePointerDown={(e) => startResize(4, e)}
          >
            Wert
          </MockSortHead>
          <MockSortHead
            col="datum"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(5, e)}
          >
            Datum
          </MockSortHead>
          <MockSortHead
            col="status"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(6, e)}
          >
            Status
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="folder-open"
            title={lifecycle === 'erledigt' ? 'Keine erledigten Vorgänge' : 'Keine offenen Vorgänge'}
            hint={
              lifecycle === 'erledigt'
                ? 'Filter zurücksetzen oder zu „Offen“ wechseln'
                : 'Auftrag entsteht aus Angebot oder Notfall — starte mit einer Anfrage.'
            }
            action={
              lifecycle === 'offen' ? (
                <MockBtn kind="primary" icon="plus" onClick={() => router.push(createAnfrageHref())}>
                  Neue Anfrage
                </MockBtn>
              ) : undefined
            }
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
      </PullToRefresh>

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
