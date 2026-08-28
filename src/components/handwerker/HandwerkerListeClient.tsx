'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MockBtn,
  MockChip,
  MockEmpty,
  MockIcon,
  MockModal,
  MockPager,
  MockSortHead,
  ListBulkBar,
} from '@/components/mock-ui'
import { MockField } from '@/components/mock-ui/MockForm'
import { ListInfiniteSentinel } from '@/components/layout/mock'
import { openFabCreate } from '@/components/neu/FabCreateHost'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { runDuplicateHandwerker, runDeleteHandwerker } from '@/lib/list-actions'
import { listSortDirNum } from '@/lib/list-mock-sort'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'
import { cn } from '@/lib/utils'
import { ListbarActionsMenu } from '@/components/layout/ListbarActionsMenu'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useResizableColumns, type ResizableColDef } from '@/hooks/useResizableColumns'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { toast } from '@/components/ui/app-toast'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { deleteHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { gewerkPillClass } from '@/lib/gewerk-pill-tone'

export type HandwerkerZeile = {
  id: string
  name: string
  firma: string | null
  vorname: string | null
  nachname: string | null
  email: string | null
  telefon: string | null
  gewerke: unknown
  gewerk_namen?: string[]
  compliance_status: string | null
  docs_vorhanden?: number
  ist_fachbetrieb?: boolean | null
  created_at: string | null
  aktiver_einsatz?: boolean
}

export type GewerkOption = { slug: string; name: string }

const EXPORT_FIELDS: ExportField[] = [
  { key: 'firma', label: 'Firmenname' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'compliance_status', label: 'Compliance' },
]

const MOCK_GEWERK_NAMES = ['Sanitär', 'Elektrik', 'Fliesen', 'Maler', 'Boden'] as const

const HW_COLS: ResizableColDef[] = [
  { id: 'check', defaultWidth: 36, minWidth: 36, maxWidth: 36, fixed: true },
  { id: 'name', defaultWidth: 200, minWidth: 130, maxWidth: 400 },
  { id: 'gewerk', defaultWidth: 140, minWidth: 100, maxWidth: 260 },
  { id: 'telefon', defaultWidth: 130, minWidth: 100, maxWidth: 200 },
  { id: 'email', defaultWidth: 200, minWidth: 130, maxWidth: 340 },
  { id: 'bewertung', defaultWidth: 88, minWidth: 72, maxWidth: 140 },
  { id: 'menu', defaultWidth: 40, minWidth: 40, maxWidth: 40, fixed: true },
]

type SortCol = 'name' | 'gewerk' | 'telefon' | 'email' | 'bewertung'

function gewerkeStr(h: HandwerkerZeile): string {
  return h.gewerk_namen?.length ? h.gewerk_namen.join(', ') : gewerkeStrRaw(h.gewerke)
}

function gewerkeStrRaw(g: unknown): string {
  if (g == null || g === '') return ''
  if (Array.isArray(g)) {
    return g
      .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof g === 'string') {
    const t = g.trim()
    // Leeres JSON-Array o. Ä. nicht als Label anzeigen
    if (t === '[]' || t === '{}' || t === 'null') return ''
    return t
  }
  try {
    const s = JSON.stringify(g)
    if (s === '[]' || s === '{}' || s === 'null') return ''
    return s
  } catch {
    return String(g)
  }
}

function handwerkerExportRow(h: HandwerkerZeile): Record<string, unknown> {
  return {
    firma: h.firma ?? handwerkerDisplayName(h),
    telefon: h.telefon ?? '',
    email: h.email ?? '',
    gewerke: gewerkeStr(h),
    compliance_status: h.compliance_status ?? '',
  }
}

function resolveGewerkChipValue(name: string, gewerkeOptionen: GewerkOption[]): string {
  const opt = gewerkeOptionen.find(
    (g) => g.name.toLowerCase() === name.toLowerCase() || g.slug === name.toLowerCase()
  )
  return opt?.slug ?? name.toLowerCase()
}

function matchesGewerk(h: HandwerkerZeile, gewerkChip: string, gewerkeOptionen: GewerkOption[]): boolean {
  const names = (h.gewerk_namen ?? []).map((x) => x.toLowerCase())
  const opt = gewerkeOptionen.find((g) => g.slug === gewerkChip)
  const matchName = opt ? names.some((n) => n.includes(opt.name.toLowerCase())) : false
  const matchSlug =
    names.some((n) => n.includes(gewerkChip)) ||
    gewerkeStrRaw(h.gewerke).toLowerCase().includes(gewerkChip)
  return matchName || matchSlug
}

export function HandwerkerListeClient({
  rows,
  gewerkeOptionen,
}: {
  rows: HandwerkerZeile[]
  gewerkeOptionen: GewerkOption[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()

  const [gewerkChip, setGewerkChip] = useState('alle')
  const [query, setQuery] = useState('')
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

  useEffect(() => {
    if (searchParams.get('neu') === '1') {
      router.replace('/handwerker')
      openFabCreate('handwerker')
    }
  }, [searchParams, router])

  const gewerkChipOptions = useMemo(() => {
    const opts: { label: string; value: string; count?: number }[] = [
      { label: 'Alle Gewerke', value: 'alle', count: rows.length },
    ]
    for (const name of MOCK_GEWERK_NAMES) {
      opts.push({ label: name, value: resolveGewerkChipValue(name, gewerkeOptionen) })
    }
    return opts
  }, [gewerkeOptionen, rows.length])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const nameNeedle = fName.trim().toLowerCase()
    return rows.filter((h) => {
      if (gewerkChip !== 'alle' && !matchesGewerk(h, gewerkChip, gewerkeOptionen)) return false
      if (nameNeedle && !handwerkerDisplayName(h).toLowerCase().includes(nameNeedle)) return false
      if (!needle) return true
      const pool = [
        handwerkerDisplayName(h),
        handwerkerGfName(h),
        h.email ?? '',
        h.telefon ?? '',
        gewerkeStr(h),
      ]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [rows, gewerkChip, query, fName, gewerkeOptionen])

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
    const sortKeys: Record<SortCol, (h: HandwerkerZeile) => string | number> = {
      name: (h) => handwerkerDisplayName(h).toLowerCase(),
      gewerk: (h) => gewerkeStr(h).toLowerCase(),
      telefon: (h) => (h.telefon ?? '').toLowerCase(),
      email: (h) => (h.email ?? '').toLowerCase(),
      bewertung: () => 0,
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

  const activeFilterCount =
    (gewerkChip !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  function resetFilters() {
    setGewerkChip('alle')
    setQuery('')
    setFName('')
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const selectedRows = useMemo(
    () => filtered.filter((h) => selected[h.id]),
    [filtered, selected]
  )

  const bulkExport = useCallback(() => {
    runMockListExport(
      exportToCSV,
      selectedRows.map(handwerkerExportRow),
      EXPORT_FIELDS,
      'handwerker-auswahl'
    )
  }, [exportToCSV, selectedRows])

  const runBulkDelete = useCallback(async () => {
    const ids = selectedRows.map((h) => h.id)
    if (!ids.length) return
    setBulkDeletePending(true)
    const loadingId = toast.loading(
      ids.length === 1 ? 'Handwerker wird gelöscht…' : `${ids.length} Handwerker werden gelöscht…`
    )
    let okCount = 0
    let lastErr: string | null = null
    for (const id of ids) {
      const r = await deleteHandwerker(id)
      if (r.ok) okCount += 1
      else lastErr = r.message
    }
    setBulkDeletePending(false)
    setBulkDeleteOpen(false)
    setSelected({})
    if (okCount > 0) {
      toast.success(okCount === 1 ? 'Handwerker gelöscht' : `${okCount} Handwerker gelöscht`, {
        id: loadingId,
      })
      router.refresh()
    } else {
      toast.error(lastErr ?? 'Löschen fehlgeschlagen', { id: loadingId })
    }
    if (okCount > 0 && lastErr) toast.error(lastErr)
  }, [router, selectedRows])

  const { gridTemplateColumns, startResize } = useResizableColumns(
    'crm.cols.handwerker.select.v3',
    HW_COLS
  )
  const resizeOffset = 1

  const paginationResetKey = `${gewerkChip}|${query}|${fName}|${sortCol}|${sortDir}`
  const {
    pageItems,
    infiniteItems,
    hasMore,
    loadMore,
    visibleCount,
    pageIndex,
    totalPages,
    total,
    pageSize,
    setPageIndex,
  } = useListPage(filtered, 12, paginationResetKey)

  function openDetail(id: string) {
    router.push(`/handwerker/${id}`)
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')
  const isMobile = useIsMobile()
  const displayItems = isMobile ? infiniteItems : pageItems

  const allPageSelected =
    displayItems.length > 0 && displayItems.every((h) => selected[h.id])
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((h) => selected[h.id])

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected({})
      return
    }
    const n: Record<string, boolean> = {}
    filtered.forEach((h) => {
      n[h.id] = true
    })
    setSelected(n)
  }

  const filterFooter = (
    <div className="sheet-footer-actions">
      <MockBtn kind="ghost" onClick={resetFilters}>
        Zurücksetzen
      </MockBtn>
      <MockBtn kind="primary" onClick={() => setFilterOpen(false)}>
        Anwenden ({filtered.length})
      </MockBtn>
    </div>
  )

  const filterFields = (
    <>
      <div className="form-section-h">Suche</div>
      <div className="input" style={{ marginBottom: 16 }}>
        <MockIcon ctx="default" n="search" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, Gewerk, Telefon, E-Mail…"
          autoFocus={!isMobile}
        />
      </div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <MockField label="Name">
          <div className="input">
            <input
              type="text"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder="Name enthält…"
            />
          </div>
        </MockField>
      </div>
      <div className="form-section-h">Gewerk</div>
      <div className="chiprow">
        {(['alle', ...MOCK_GEWERK_NAMES] as const).map((g) => {
          const value = g === 'alle' ? 'alle' : resolveGewerkChipValue(g, gewerkeOptionen)
          return (
            <MockChip key={g} active={gewerkChip === value} onClick={() => setGewerkChip(value)}>
              {g === 'alle' ? 'Alle' : g}
            </MockChip>
          )
        })}
      </div>
    </>
  )

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Gewerke">
            {gewerkChipOptions.map((o) => (
              <MockChip
                key={o.value}
                active={gewerkChip === o.value}
                count={o.count}
                onClick={() => setGewerkChip(o.value)}
              >
                {o.label}
              </MockChip>
            ))}
          </div>
          <ListbarActionsMenu
          title="Listen-Aktionen"
          activeHint={activeFilterCount}
          directOpen={() => setFilterOpen(true)}
          items={[
            {
              icon: 'filter',
              label: 'Filter & Suchen',
              hint: activeFilterCount ? `${activeFilterCount} aktiv` : undefined,
              active: activeFilterCount > 0,
              onSelect: () => setFilterOpen(true),
            },
            {
              icon: 'download',
              label: 'CSV exportieren',
              onSelect: () =>
                runMockListExport(
                  exportToCSV,
                  (filtered.length ? filtered : rows).map(handwerkerExportRow),
                  EXPORT_FIELDS,
                  'handwerker'
                ),
            },
          ]}
          desktop={
            <>
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
                icon="download"
                kind="ghost"
                sm
                title="CSV exportieren"
                onClick={() =>
                  runMockListExport(
                    exportToCSV,
                    (filtered.length ? filtered : rows).map(handwerkerExportRow),
                    EXPORT_FIELDS,
                    'handwerker'
                  )
                }
              />
            </>
          }
        />
        </div>
      </div>

      {isMobile ? (
        <MobileListFilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Filter & Suchen"
          headerEnd={
            <button
              type="button"
              className="mobile-filter-sheet__reset"
              onClick={resetFilters}
              disabled={!activeFilterCount}
            >
              Zurücksetzen
            </button>
          }
          footer={
            <button type="button" className="btn primary" onClick={() => setFilterOpen(false)}>
              Anwenden ({filtered.length})
            </button>
          }
        >
          {filterFields}
        </MobileListFilterSheet>
      ) : (
        <MockModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          icon="filter"
          title="Filter & Suchen"
          sub="Partner eingrenzen"
          footer={filterFooter}
        >
          {filterFields}
        </MockModal>
      )}

      {selectedCount > 0 ? (
        <ListBulkBar
          selectedCount={selectedCount}
          onClear={() => setSelected({})}
          onExport={bulkExport}
          onDelete={() => setBulkDeleteOpen(true)}
          deleteDisabled={bulkDeletePending}
          deletePending={bulkDeletePending}
        />
      ) : null}

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={
          selectedCount === 1 ? 'Handwerker löschen?' : `${selectedCount} Handwerker löschen?`
        }
        sub="Dauerhaft entfernen."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={bulkDeletePending} onClick={() => setBulkDeleteOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={bulkDeletePending ? undefined : 'trash'}
              disabled={bulkDeletePending}
              onClick={() => void runBulkDelete()}
            >
              {bulkDeletePending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {bulkDeletePending
            ? 'Bitte warten…'
            : selectedCount === 1
              ? 'Der ausgewählte Handwerker wird unwiderruflich gelöscht.'
              : `${selectedCount} ausgewählte Handwerker werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      <PullToRefresh onRefresh={() => router.refresh()}>
      <div
        className="listcard listcard--scroll listcard--cols vg-selectmode"
        style={{ ['--list-cols' as string]: gridTemplateColumns }}
      >
        <div className="list-row head">
          <ListRowCheck
            checked={allFilteredSelected}
            partial={allPageSelected && !allFilteredSelected}
            onToggle={toggleSelectAll}
            title={allFilteredSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
          />
          <MockSortHead
            col="name"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 0, e)}
          >
            Name
          </MockSortHead>
          <MockSortHead
            col="gewerk"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 1, e)}
          >
            Gewerk
          </MockSortHead>
          <MockSortHead
            col="telefon"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 2, e)}
          >
            Telefon
          </MockSortHead>
          <MockSortHead
            col="email"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 3, e)}
          >
            Email
          </MockSortHead>
          <MockSortHead
            col="bewertung"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            right
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 4, e)}
          >
            Bewertung
          </MockSortHead>
          <div />
        </div>

        {displayItems.length === 0 ? (
          <MockEmpty
            icon="tool"
            title={rows.length === 0 ? 'Keine Partner' : 'Keine Treffer'}
            hint={rows.length === 0 ? 'Partner anlegen' : 'Filter zurücksetzen'}
            action={
              rows.length === 0 ? (
                <MockBtn kind="primary" icon="plus" onClick={() => openFabCreate('handwerker')}>
                  Handwerker anlegen
                </MockBtn>
              ) : (
                <MockBtn kind="ghost" onClick={resetFilters}>
                  Filter zurücksetzen
                </MockBtn>
              )
            }
          />
        ) : (
          displayItems.map((h) => {
            const gewerke = (h.gewerk_namen ?? []).map((g) => g.trim()).filter(Boolean)
            const gewerkeFallback = gewerke.length === 0 ? gewerkeStr(h) : ''
            const pills =
              gewerke.length > 0
                ? gewerke.slice(0, 3)
                : gewerkeFallback
                  ? gewerkeFallback
                      .split(/[·,]/)
                      .map((g) => g.trim())
                      .filter((g) => g && g !== '[]' && g !== '—')
                      .slice(0, 3)
                  : []
            const primaryGewerk = pills[0] ?? null
            const tel = h.telefon?.trim() || ''
            const mail = h.email?.trim() || ''
            const copy = () => runDuplicateHandwerker(h.id, router)
            const edit = () => openDetail(h.id)
            const del = () => {
              void runDeleteHandwerker(h.id, router, handwerkerDisplayName(h))
            }
            const rowMenu: EntityMenuItem[] = [
              { icon: 'external-link', label: 'Öffnen', onClick: () => openDetail(h.id) },
              { icon: 'pencil', label: 'Bearbeiten', onClick: edit },
              { icon: 'copy', label: 'Duplizieren', onClick: copy },
              'sep',
              { icon: 'trash', label: 'Löschen', danger: true, onClick: del },
            ]
            const menuCell = (
              <div
                className="vg-row-menu"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <MockEntityRowMenu items={rowMenu} title="Aktionen" />
              </div>
            )
            const row = isMobile ? (
              <div
                role="button"
                tabIndex={0}
                className={cn('vg-row vg-row--kontakt', selected[h.id] && 'sel')}
                onClick={() => openDetail(h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(h.id)
                  }
                }}
              >
                <ListRowCheck
                  checked={Boolean(selected[h.id])}
                  onToggle={() => toggleSel(h.id)}
                />
                <div className="vg-vorgang">
                  <div className="t" title={handwerkerDisplayName(h)}>
                    {handwerkerDisplayName(h)}
                  </div>
                </div>
                <div className="vg-status">
                  {primaryGewerk ? (
                    <span
                      className={gewerkPillClass(primaryGewerk)}
                      title={pills.join(' · ') || undefined}
                    >
                      {primaryGewerk}
                    </span>
                  ) : null}
                </div>
                <div className="vg-kontakt">
                  <span title={tel || undefined}>{tel || '—'}</span>
                  <span title={mail || undefined}>{mail || '—'}</span>
                </div>
                {menuCell}
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                className={cn('list-row', selected[h.id] && 'sel')}
                onClick={() => openDetail(h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(h.id)
                  }
                }}
              >
                <ListRowCheck
                  checked={Boolean(selected[h.id])}
                  onToggle={() => toggleSel(h.id)}
                />
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {handwerkerDisplayName(h)}
                </div>
                <div className="lc-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {pills.map((g) => (
                    <span key={g} className={gewerkPillClass(g)}>
                      {g}
                    </span>
                  ))}
                </div>
                <div className="lc-desk" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {tel || '—'}
                </div>
                <div
                  className="lc-desk"
                  style={{
                    color: 'var(--text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mail || '—'}
                </div>
                <div className="lc-desk" style={{ textAlign: 'center' }}>
                  <span className="rating" style={{ color: 'var(--text-4)' }}>
                    <MockIcon ctx="default" n="star-filled" size={12} />
                    —
                  </span>
                </div>
                {menuCell}
              </div>
            )
            return (
              <SwipeRow
                key={h.id}
                disabled={!isMobile}
                leftActions={
                  isMobile
                    ? [{ icon: 'trash', label: 'Löschen', onClick: del, tone: 'danger' }]
                    : undefined
                }
                rightActions={
                  isMobile
                    ? [
                        { icon: 'pencil', label: 'Bearbeiten', onClick: edit, tone: 'primary' },
                        { icon: 'copy', label: 'Kopieren', onClick: copy, tone: 'accent' },
                      ]
                    : undefined
                }
              >
                {row}
              </SwipeRow>
            )
          })
        )}
      </div>
      </PullToRefresh>

      {isMobile ? (
        <ListInfiniteSentinel
          hasMore={hasMore}
          onLoadMore={loadMore}
          shown={visibleCount}
          total={total}
          unit="Partner"
        />
      ) : (
        <MockPager
          pageIndex={pageIndex}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          unit="Partner"
          onPageChange={(p) => setPageIndex(p - 1)}
        />
      )}
    </div>
  )
}
