'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
import { runMockListExport } from '@/lib/mock-list-export'
import { listSortDirNum } from '@/lib/list-mock-sort'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { KundeModal } from '@/components/kunden/KundeModal'
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

const GRID_COLS = '1.4fr 1fr 1.2fr 1.6fr 40px'

type TypListenFilter = 'alle' | 'privat' | 'gewerbe' | 'hausverwaltung'
type SortCol = 'name' | 'typ' | 'telefon' | 'email'

function kundeTypLabel(typ: string | null | undefined): string {
  const t = (typ || '').toLowerCase()
  if (t === 'gewerbe') return 'Gewerbe'
  if (t === 'hausverwaltung') return 'Hausverwaltung'
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

export function KundenListeClient({ kunden }: { kunden: KundeListeZeile[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()

  const [modalOpen, setModalOpen] = useState(false)
  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  function closeNeuModal() {
    setModalOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('neu')
    const q = params.toString()
    router.replace(q ? `/kunden?${q}` : '/kunden', { scroll: false })
  }

  function openNeuModal() {
    setModalOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('neu', '1')
    router.replace(`/kunden?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setModalOpen(true)
  }, [searchParams])

  const typCounts = useMemo(() => {
    let privat = 0
    let gewerbe = 0
    let hausverwaltung = 0
    for (const k of kunden) {
      const t = (k.typ || '').toLowerCase()
      if (t === 'gewerbe') gewerbe++
      else if (t === 'hausverwaltung') hausverwaltung++
      else privat++
    }
    return { alle: kunden.length, privat, gewerbe, hausverwaltung }
  }, [kunden])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return kunden.filter((k) => {
      if (typFilter !== 'alle' && (k.typ || '').toLowerCase() !== typFilter) return false
      if (!needle) return true
      const pool = [kundeListenName(k), k.name, k.email ?? '', k.telefon ?? '', k.kundennummer ?? '']
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [kunden, typFilter, query])

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

  const activeFilterCount = (typFilter !== 'alle' ? 1 : 0) + (query ? 1 : 0)

  function resetFilters() {
    setTypFilter('alle')
    setQuery('')
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const paginationResetKey = `${typFilter}|${query}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/kunden/${id}`)
  }

  function rowMenuItems(k: KundeListeZeile): EntityMenuItem[] {
    return [
      {
        label: 'Öffnen',
        icon: 'eye',
        onClick: () => openDetail(k.id),
      },
      {
        label: 'Bearbeiten',
        icon: 'pencil',
        onClick: () => router.push(`/kunden/${k.id}?edit=1`),
      },
    ]
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
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
                (filtered.length ? filtered : kunden).map(toExportRow),
                EXPORT_FIELDS,
                'kunden'
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
        sub="Kunden eingrenzen"
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
            placeholder="Name, Telefon, E-Mail…"
            autoFocus
          />
        </div>
        <div className="form-section-h">Kundentyp</div>
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
      </MockModal>

      <div className="listcard">
        <div className="list-row-grid head" style={{ gridTemplateColumns: GRID_COLS }}>
          <MockSortHead col="name" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Kunde
          </MockSortHead>
          <MockSortHead col="typ" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Typ
          </MockSortHead>
          <MockSortHead col="telefon" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="email" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <div aria-hidden />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="users"
            title={kunden.length === 0 ? 'Noch keine Kunden' : 'Keine Treffer'}
            hint={
              kunden.length === 0
                ? 'Neuen Kunden anlegen oder Anfrage erfassen'
                : 'Filter zurücksetzen'
            }
          />
        ) : (
          pageItems.map((k) => (
            <div
              key={k.id}
              role="button"
              tabIndex={0}
              className={`list-row-grid${selectMode && selected[k.id] ? ' sel' : ''}`}
              style={{ gridTemplateColumns: GRID_COLS }}
              onClick={() => (selectMode ? toggleSel(k.id) : openDetail(k.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectMode ? toggleSel(k.id) : openDetail(k.id)
                }
              }}
            >
              <p className="list-row-primary truncate">{kundeListenName(k)}</p>
              <div>
                <span className="pill-tag">{kundeTypLabel(k.typ)}</span>
              </div>
              <p className="truncate text-[13px] text-bw-text">{k.telefon?.trim() || '—'}</p>
              <p className="truncate text-[13px] text-bw-text">{k.email?.trim() || '—'}</p>
              <div className="vg-actions" onClick={(e) => e.stopPropagation()}>
                <MockEntityRowMenu items={rowMenuItems(k)} title="Kunde" />
              </div>
            </div>
          ))
        )}
      </div>

      <MockPager
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        unit="Kunden"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

      <KundeModal open={modalOpen} onClose={closeNeuModal} editKunde={null} />
    </div>
  )
}
