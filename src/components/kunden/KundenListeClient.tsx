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
import { MockField } from '@/components/mock-ui/MockForm'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { listSortDirNum } from '@/lib/list-mock-sort'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { buildEntityMenu } from '@/lib/entity-menu'
import { cn } from '@/lib/utils'

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kundennummer', label: 'Kundennummer' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'typ', label: 'Typ' },
  { key: 'plz', label: 'PLZ' },
  { key: 'ort', label: 'Ort' },
]

const COLS = '1.4fr 1fr 1.2fr 1.6fr 60px'

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

  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [query, setQuery] = useState('')
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  useEffect(() => {
    if (searchParams.get('neu') === '1') {
      router.replace('/neu?art=kunde')
    }
  }, [searchParams, router])

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
    const nameNeedle = fName.trim().toLowerCase()
    return kunden.filter((k) => {
      if (typFilter !== 'alle' && (k.typ || '').toLowerCase() !== typFilter) return false
      if (nameNeedle && !kundeListenName(k).toLowerCase().includes(nameNeedle)) return false
      if (!needle) return true
      const pool = [kundeListenName(k), k.name, k.email ?? '', k.telefon ?? '', k.kundennummer ?? '']
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
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))
  const allSelected = filtered.length > 0 && filtered.every((k) => selected[k.id])

  const gridCols = (selectMode ? '40px ' : '') + COLS

  const paginationResetKey = `${typFilter}|${query}|${fName}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/kunden/${id}`)
  }

  function rowMenuItems(k: KundeListeZeile): EntityMenuItem[] {
    return buildEntityMenu(
      'kunde',
      { name: k.name, tel: k.telefon, mail: k.email },
      {
        onEdit: () => router.push(`/kunden/${k.id}?edit=1`),
        tel: k.telefon,
        mail: k.email,
      }
    )
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
      </MockModal>

      <div className={cn('listcard', selectMode && 'vg-selectmode')}>
        <div className="list-row head" style={{ gridTemplateColumns: gridCols }}>
          {selectMode ? (
            <div
              className="vg-check"
              onClick={(e) => {
                e.stopPropagation()
                if (allSelected) setSelected({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((k) => {
                    n[k.id] = true
                  })
                  setSelected(n)
                }
              }}
            >
              <span className={cn('vg-box', allSelected && 'on')}>
                {allSelected ? <MockIcon ctx="default" n="check" size={12} /> : null}
              </span>
            </div>
          ) : null}
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
              className={cn('list-row', selected[k.id] && 'sel')}
              style={{ gridTemplateColumns: gridCols }}
              onClick={() => (selectMode ? toggleSel(k.id) : openDetail(k.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectMode ? toggleSel(k.id) : openDetail(k.id)
                }
              }}
            >
              {selectMode ? (
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSel(k.id)
                  }}
                >
                  <span className={cn('vg-box', selected[k.id] && 'on')}>
                    {selected[k.id] ? <MockIcon ctx="default" n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {kundeListenName(k)}
              </div>
              <div className="lc-pills">
                <span className="pill-tag">{kundeTypLabel(k.typ)}</span>
              </div>
              <div style={{ color: 'var(--text-2)' }}>{k.telefon?.trim() || '—'}</div>
              <div
                style={{
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {k.email?.trim() || '—'}
              </div>
              <div
                className="row-actions always"
                onClick={(e) => e.stopPropagation()}
                style={{ justifyContent: 'flex-end' }}
              >
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
    </div>
  )
}
