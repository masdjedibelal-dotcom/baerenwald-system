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
} from '@/components/mock-ui'
import { MockField } from '@/components/mock-ui/MockForm'
import { ListInfiniteSentinel } from '@/components/layout/mock'
import { openFabCreate } from '@/components/neu/FabCreateHost'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { runDuplicateKunde, runDeleteKunde } from '@/lib/list-actions'
import { listSortDirNum } from '@/lib/list-mock-sort'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { TypBadge } from '@/components/kunden/TypBadge'
import { cn } from '@/lib/utils'
import { deleteKunde, mergeKunden } from '@/app/actions/kunden'
import { KundenMergeAssistentSheet } from '@/components/kunden/KundenMergeAssistentSheet'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ListbarActionsMenu } from '@/components/layout/ListbarActionsMenu'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { useResizableColumns, type ResizableColDef } from '@/hooks/useResizableColumns'
import type { EntityMenuItem } from '@/lib/entity-menu'

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kundennummer', label: 'Kundennummer' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'typ', label: 'Typ' },
  { key: 'plz', label: 'PLZ' },
  { key: 'ort', label: 'Ort' },
]

const KUNDEN_COLS: ResizableColDef[] = [
  { id: 'check', defaultWidth: 36, minWidth: 36, maxWidth: 36, fixed: true },
  { id: 'name', defaultWidth: 220, minWidth: 140, maxWidth: 420 },
  { id: 'typ', defaultWidth: 130, minWidth: 90, maxWidth: 200 },
  { id: 'telefon', defaultWidth: 150, minWidth: 110, maxWidth: 220 },
  { id: 'email', defaultWidth: 220, minWidth: 140, maxWidth: 360 },
  { id: 'menu', defaultWidth: 40, minWidth: 40, maxWidth: 40, fixed: true },
]

type TypListenFilter = 'alle' | 'privat' | 'gewerbe' | 'hausverwaltung'
type SortCol = 'name' | 'typ' | 'telefon' | 'email'

/** Listen-Filter-Bucket: Legacy-Typen (z. B. eigentuemer) → Privat. */
function kundeTypFilterBucket(
  typ: string | null | undefined
): Exclude<TypListenFilter, 'alle'> {
  const t = (typ || '').toLowerCase()
  if (t === 'gewerbe') return 'gewerbe'
  if (t === 'hausverwaltung' || t === 'verwaltung') return 'hausverwaltung'
  return 'privat'
}

function kundeTypLabel(typ: string | null | undefined): string {
  const bucket = kundeTypFilterBucket(typ)
  if (bucket === 'gewerbe') return 'Gewerbe'
  if (bucket === 'hausverwaltung') return 'Hausverwaltung'
  return 'Privat'
}

function kundeListenName(k: KundeListeZeile): string {
  return kundeDisplayName(k)
}

function toExportRow(k: KundeListeZeile) {
  return {
    name: kundeListenName(k),
    kundennummer: k.kundennummer ?? '',
    email: k.email ?? '',
    telefon: k.telefon ?? '',
    typ: k.typ,
    plz: k.plz ?? '',
    ort: k.ort ?? '',
  }
}

export function KundenListeClient({
  kunden,
}: {
  kunden: KundeListeZeile[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()

  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [query, setQuery] = useState('')
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [mergeListOpen, setMergeListOpen] = useState(false)
  const [mergeAssistentOpen, setMergeAssistentOpen] = useState(false)
  const [listMergePending, setListMergePending] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

  useEffect(() => {
    if (searchParams.get('neu') === '1') {
      router.replace('/kunden')
      openFabCreate('kunde')
    }
  }, [searchParams, router])

  const typCounts = useMemo(() => {
    let privat = 0
    let gewerbe = 0
    let hausverwaltung = 0
    for (const k of kunden) {
      const bucket = kundeTypFilterBucket(k.typ)
      if (bucket === 'gewerbe') gewerbe++
      else if (bucket === 'hausverwaltung') hausverwaltung++
      else privat++
    }
    return { alle: kunden.length, privat, gewerbe, hausverwaltung }
  }, [kunden])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const nameNeedle = fName.trim().toLowerCase()
    return kunden.filter((k) => {
      if (typFilter !== 'alle' && kundeTypFilterBucket(k.typ) !== typFilter) return false
      if (nameNeedle && !kundeListenName(k).toLowerCase().includes(nameNeedle)) return false
      if (!needle) return true
      const pool = [
        kundeListenName(k),
        k.name,
        (k as { org_anzeigename?: string | null }).org_anzeigename ?? '',
        k.email ?? '',
        k.telefon ?? '',
        k.kundennummer ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [kunden, typFilter, query, fName])

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
    const sortKeys: Record<SortCol, (k: KundeListeZeile) => string> = {
      name: (k) => kundeListenName(k).toLowerCase(),
      typ: (k) => kundeTypLabel(k.typ).toLowerCase(),
      telefon: (k) => (k.telefon ?? '').toLowerCase(),
      email: (k) => (k.email ?? '').toLowerCase(),
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
    (typFilter !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  function resetFilters() {
    setTypFilter('alle')
    setQuery('')
    setFName('')
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectedKunden = useMemo(() => {
    return kunden.filter((k) => selected[k.id])
  }, [kunden, selected])
  const listMergePair =
    selectedCount === 2 && selectedKunden.length === 2
      ? [...selectedKunden].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      : null
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const selectedRows = useMemo(
    () => filtered.filter((k) => selected[k.id]),
    [filtered, selected]
  )

  const bulkExport = useCallback(() => {
    runMockListExport(
      exportToCSV,
      selectedRows.map(toExportRow),
      EXPORT_FIELDS,
      'kunden-auswahl'
    )
  }, [exportToCSV, selectedRows])

  const runBulkDelete = useCallback(async () => {
    const ids = selectedRows.map((k) => k.id)
    if (!ids.length) return
    setBulkDeletePending(true)
    const loadingId = toast.loading(
      ids.length === 1 ? 'Kunde wird gelöscht…' : `${ids.length} Kunden werden gelöscht…`
    )
    let okCount = 0
    let lastErr: string | null = null
    for (const id of ids) {
      const r = await deleteKunde(id)
      if (r.ok) okCount += 1
      else lastErr = r.message
    }
    setBulkDeletePending(false)
    setBulkDeleteOpen(false)
    setSelected({})
    if (okCount > 0) {
      toast.success(okCount === 1 ? 'Kunde gelöscht' : `${okCount} Kunden gelöscht`, {
        id: loadingId,
      })
      router.refresh()
    } else {
      toast.error(lastErr ?? 'Löschen fehlgeschlagen', { id: loadingId })
    }
    if (okCount > 0 && lastErr) toast.error(lastErr)
  }, [router, selectedRows])

  const { gridTemplateColumns, startResize } = useResizableColumns(
    'crm.cols.kunden.select.v2',
    KUNDEN_COLS
  )
  const resizeOffset = 1

  const paginationResetKey = `${typFilter}|${query}|${fName}|${sortCol}|${sortDir}`
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
    router.push(`/kunden/${id}`)
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')
  const isMobile = useIsMobile()
  const displayItems = isMobile ? infiniteItems : pageItems

  const allPageSelected =
    displayItems.length > 0 && displayItems.every((k) => selected[k.id])
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((k) => selected[k.id])

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected({})
      return
    }
    const n: Record<string, boolean> = {}
    filtered.forEach((k) => {
      n[k.id] = true
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
          placeholder="Name, Telefon, E-Mail…"
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
      <div className="form-section-h">Typ</div>
      <div className="chiprow">
        {(
          [
            ['alle', 'Alle'],
            ['privat', 'Privat'],
            ['hausverwaltung', 'Hausverwaltung'],
            ['gewerbe', 'Gewerbe'],
          ] as const
        ).map(([value, label]) => (
          <MockChip key={value} active={typFilter === value} onClick={() => setTypFilter(value)}>
            {label}
          </MockChip>
        ))}
      </div>
    </>
  )

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Kundentyp">
            {(
              [
                ['alle', 'Alle', typCounts.alle],
                ['privat', 'Privat', typCounts.privat],
                ['hausverwaltung', 'Hausverwaltung', typCounts.hausverwaltung],
                ['gewerbe', 'Gewerbe', typCounts.gewerbe],
              ] as const
            ).map(([value, label, count]) => (
              <MockChip
                key={value}
                active={typFilter === value}
                count={count}
                onClick={() => setTypFilter(value)}
              >
                {label}
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
                icon: 'download',
                label: 'CSV exportieren',
                onSelect: () =>
                  runMockListExport(
                    exportToCSV,
                    (filtered.length ? filtered : kunden).map(toExportRow),
                    EXPORT_FIELDS,
                    'kunden'
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
                      (filtered.length ? filtered : kunden).map(toExportRow),
                      EXPORT_FIELDS,
                      'kunden'
                    )
                  }
                />
                <MockBtn
                  icon="users"
                  kind="ghost"
                  sm
                  title="Duplikate-Assistent"
                  onClick={() => setMergeAssistentOpen(true)}
                />
              </>
            }
          />
        </div>
      </div>

      <KundenMergeAssistentSheet
        open={mergeAssistentOpen}
        onClose={() => setMergeAssistentOpen(false)}
        onMerged={() => router.refresh()}
      />

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
          sub="Kunden eingrenzen"
          footer={filterFooter}
        >
          {filterFields}
        </MockModal>
      )}

      {selectedCount > 0 ? (
        <div className="bulkbar">
          <span className="bulkbar-count">
            <b>{selectedCount}</b> ausgewählt
          </span>
          <div style={{ flex: 1 }} />
          <MockBtn kind="ghost" sm icon="download" onClick={bulkExport}>
            Export
          </MockBtn>
          {selectedCount === 2 ? (
            <MockBtn kind="ghost" sm icon="link" onClick={() => setMergeListOpen(true)}>
              Zusammenführen
            </MockBtn>
          ) : null}
          <MockBtn
            kind="danger"
            sm
            icon="trash"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeletePending}
          >
            Löschen
          </MockBtn>
          <MockBtn
            kind="ghost"
            sm
            className="qa-btn bulkbar-clear"
            icon="x"
            onClick={() => setSelected({})}
            title="Auswahl aufheben"
          />
        </div>
      ) : null}

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={selectedCount === 1 ? 'Kunde löschen?' : `${selectedCount} Kunden löschen?`}
        sub="Inkl. aller Vorgänge und Rechnungen — dauerhaft entfernen."
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
              ? 'Der ausgewählte Kunde wird unwiderruflich gelöscht — inklusive aller Vorgänge und Rechnungen.'
              : `${selectedCount} ausgewählte Kunden werden unwiderruflich gelöscht — inklusive aller Vorgänge und Rechnungen.`}
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
            Kunde
          </MockSortHead>
          <MockSortHead
            col="typ"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startResize(resizeOffset + 1, e)}
          >
            Typ
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
          <div />
        </div>

        {displayItems.length === 0 ? (
          <MockEmpty
            icon="users"
            title={kunden.length === 0 ? 'Noch keine Kunden' : 'Keine Treffer'}
            hint={
              kunden.length === 0
                ? 'Neuen Kunden anlegen oder Anfrage erfassen'
                : 'Filter zurücksetzen'
            }
            action={
              kunden.length === 0 ? (
                <MockBtn kind="primary" icon="plus" onClick={() => openFabCreate('kunde')}>
                  Neuen Kunden anlegen
                </MockBtn>
              ) : (
                <MockBtn kind="ghost" onClick={resetFilters}>
                  Filter zurücksetzen
                </MockBtn>
              )
            }
          />
        ) : (
          displayItems.map((k) => {
            const tel = k.telefon?.trim() || ''
            const mail = k.email?.trim() || ''
            const copy = () => runDuplicateKunde(k.id, router)
            const edit = () => openDetail(k.id)
            const del = () => {
              void runDeleteKunde(k.id, router, kundeListenName(k))
            }
            const rowMenu: EntityMenuItem[] = [
              { icon: 'external-link', label: 'Öffnen', onClick: () => openDetail(k.id) },
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
                className={cn('vg-row vg-row--kontakt', selected[k.id] && 'sel')}
                onClick={() => openDetail(k.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(k.id)
                  }
                }}
              >
                <ListRowCheck
                  checked={Boolean(selected[k.id])}
                  onToggle={() => toggleSel(k.id)}
                />
                <div className="vg-vorgang">
                  <div className="t" title={kundeListenName(k)}>
                    {kundeListenName(k)}
                  </div>
                </div>
                <div className="vg-status">
                  <TypBadge typ={k.typ ?? 'privat'} />
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
                className={cn('list-row', selected[k.id] && 'sel')}
                onClick={() => openDetail(k.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(k.id)
                  }
                }}
              >
                <ListRowCheck
                  checked={Boolean(selected[k.id])}
                  onToggle={() => toggleSel(k.id)}
                />
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {kundeListenName(k)}
                </div>
                <div className="lc-pills">
                  <TypBadge typ={k.typ ?? 'privat'} />
                </div>
                <div className="lc-desk" style={{ color: 'var(--text-2)' }}>
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
                {menuCell}
              </div>
            )
            return (
              <SwipeRow
                key={k.id}
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
          unit="Kunden"
        />
      ) : (
        <MockPager
          pageIndex={pageIndex}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          unit="Kunden"
          onPageChange={(p) => setPageIndex(p - 1)}
        />
      )}

      <Modal
        open={mergeListOpen && Boolean(listMergePair)}
        onClose={() => setMergeListOpen(false)}
        title="Kunden zusammenführen"
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMergeListOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              loading={listMergePending}
              onClick={() => {
                if (!listMergePair) return
                const [survivor, merge] = listMergePair
                setListMergePending(true)
                void mergeKunden(survivor.id, merge.id).then((res) => {
                  setListMergePending(false)
                  if (!res.ok) {
                    toast.error(res.message)
                    return
                  }
                  toast.success(res.message)
                  setMergeListOpen(false)
                  setSelected({})
                  router.push(`/kunden/${survivor.id}`)
                  router.refresh()
                })
              }}
            >
              Zusammenführen
            </Button>
          </div>
        }
      >
        {listMergePair ? (
          <p className="text-[length:var(--fs-text)] text-bw-text">
            Kunde <strong>{kundeListenName(listMergePair[1])}</strong> in{' '}
            <strong>{kundeListenName(listMergePair[0])}</strong> überführen?{' '}
            <strong>{kundeListenName(listMergePair[1])}</strong> wird entfernt. (Der ältere Datensatz bleibt
            erhalten.)
          </p>
        ) : null}
      </Modal>
    </div>
  )
}
