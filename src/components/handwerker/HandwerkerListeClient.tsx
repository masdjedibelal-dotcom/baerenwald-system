'use client'

import Link from 'next/link'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
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
import type { EntityMenuItem } from '@/lib/entity-menu'
import { normalizeComplianceBadgeKey } from '@/components/handwerker/ComplianceBadge'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { listSortDirNum } from '@/lib/list-mock-sort'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'
import { cn } from '@/lib/utils'

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
const COLS = 'minmax(120px,1.6fr) minmax(90px,1fr) 118px minmax(120px,1.6fr) 72px 96px 40px'

type SortCol = 'name' | 'gewerk' | 'telefon' | 'email' | 'bewertung' | 'status'

function gewerkeStr(h: HandwerkerZeile): string {
  return h.gewerk_namen?.length ? h.gewerk_namen.join(', ') : gewerkeStrRaw(h.gewerke)
}

function gewerkeStrRaw(g: unknown): string {
  if (g == null || g === '') return ''
  if (typeof g === 'string') return g
  try {
    return JSON.stringify(g)
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

function isComplianceNichtOk(h: HandwerkerZeile): boolean {
  return normalizeComplianceBadgeKey(h.compliance_status) !== 'ok'
}

function handwerkerStatusBadge(h: HandwerkerZeile) {
  if (h.aktiver_einsatz) return <MockBadge kind={hubSpotStatusToMockBadgeKind('order')}>Aktiv</MockBadge>
  return <MockBadge kind={hubSpotStatusToMockBadgeKind('done')}>Verfügbar</MockBadge>
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
  const [nurZuPruefen, setNurZuPruefen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  useEffect(() => {
    if (searchParams.get('neu') === '1') {
      router.replace('/neu?art=handwerker')
    }
  }, [searchParams, router])

  const complianceCount = useMemo(
    () => rows.filter((h) => isComplianceNichtOk(h)).length,
    [rows]
  )

  const gewerkChipOptions = useMemo(() => {
    const opts: { label: string; value: string; count?: number; icon?: string }[] = [
      { label: 'Alle Gewerke', value: 'alle', count: rows.length },
    ]
    for (const name of MOCK_GEWERK_NAMES) {
      opts.push({ label: name, value: resolveGewerkChipValue(name, gewerkeOptionen) })
    }
    opts.push({
      label: 'Compliance',
      value: 'compliance',
      count: complianceCount,
      icon: 'alert-triangle',
    })
    return opts
  }, [gewerkeOptionen, rows.length, complianceCount])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const nameNeedle = fName.trim().toLowerCase()
    return rows.filter((h) => {
      if (gewerkChip === 'compliance') {
        if (!isComplianceNichtOk(h)) return false
      } else if (gewerkChip !== 'alle') {
        if (!matchesGewerk(h, gewerkChip, gewerkeOptionen)) return false
      }
      if (nurZuPruefen && !isComplianceNichtOk(h)) return false
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
  }, [rows, gewerkChip, nurZuPruefen, query, fName, gewerkeOptionen])

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
      status: (h) => (h.aktiver_einsatz ? 0 : 1),
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
    (gewerkChip !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0) + (nurZuPruefen ? 1 : 0)

  function resetFilters() {
    setGewerkChip('alle')
    setQuery('')
    setFName('')
    setNurZuPruefen(false)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))
  const allSelected = filtered.length > 0 && filtered.every((h) => selected[h.id])
  const gridCols = (selectMode ? '40px ' : '') + COLS

  const paginationResetKey = `${gewerkChip}|${query}|${fName}|${nurZuPruefen}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/handwerker/${id}`)
  }

  function rowMenuItems(h: HandwerkerZeile): EntityMenuItem[] {
    return [
      { label: 'Öffnen', icon: 'eye', onClick: () => openDetail(h.id) },
      { label: 'Bearbeiten', icon: 'pencil', onClick: () => openDetail(h.id) },
    ]
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {gewerkChipOptions.map((o) => (
            <MockChip
              key={o.value}
              active={gewerkChip === o.value}
              count={o.count}
              icon={o.icon}
              onClick={() => setGewerkChip(o.value)}
            >
              {o.label}
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
                (filtered.length ? filtered : rows).map(handwerkerExportRow),
                EXPORT_FIELDS,
                'handwerker'
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
        sub="Partner eingrenzen"
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
            placeholder="Name, Gewerk, Telefon, E-Mail…"
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
        <div className="form-section-h">Gewerk</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {(['alle', ...MOCK_GEWERK_NAMES] as const).map((g) => {
            const value = g === 'alle' ? 'alle' : resolveGewerkChipValue(g, gewerkeOptionen)
            return (
              <MockChip key={g} active={gewerkChip === value} onClick={() => setGewerkChip(value)}>
                {g === 'alle' ? 'Alle' : g}
              </MockChip>
            )
          })}
        </div>
        <div className="form-section-h">Compliance</div>
        <div className="chiprow">
          <MockChip active={!nurZuPruefen} onClick={() => setNurZuPruefen(false)}>
            Alle
          </MockChip>
          <MockChip active={nurZuPruefen} onClick={() => setNurZuPruefen(true)}>
            Nur zu prüfen
          </MockChip>
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
                  filtered.forEach((h) => {
                    n[h.id] = true
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
            Name
          </MockSortHead>
          <MockSortHead col="gewerk" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Gewerk
          </MockSortHead>
          <MockSortHead col="telefon" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="email" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <MockSortHead
            col="bewertung"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
            right
          >
            Bewertung
          </MockSortHead>
          <MockSortHead col="status" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Status
          </MockSortHead>
          <div aria-hidden />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="tool"
            title={rows.length === 0 ? 'Keine Partner' : 'Keine Treffer'}
            hint={rows.length === 0 ? 'Partner anlegen' : 'Filter zurücksetzen'}
          />
        ) : (
          pageItems.map((h) => {
            const gewerke = h.gewerk_namen ?? []
            const gewerkeFallback = gewerke.length === 0 ? gewerkeStr(h) : ''
            const pills =
              gewerke.length > 0
                ? gewerke.slice(0, 3)
                : gewerkeFallback
                  ? gewerkeFallback.split(/[·,]/).map((g) => g.trim()).filter(Boolean).slice(0, 3)
                  : []
            return (
              <Link
                key={h.id}
                href={`/handwerker/${h.id}`}
                className={cn('list-row', selected[h.id] && 'sel')}
                style={{ gridTemplateColumns: gridCols }}
                onClick={(e) => {
                  if (selectMode) {
                    e.preventDefault()
                    toggleSel(h.id)
                  }
                }}
              >
                {selectMode ? (
                  <div
                    className="vg-check"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSel(h.id)
                    }}
                  >
                    <span className={cn('vg-box', selected[h.id] && 'on')}>
                      {selected[h.id] ? <MockIcon ctx="default" n="check" size={12} /> : null}
                    </span>
                  </div>
                ) : null}
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {handwerkerDisplayName(h)}
                </div>
                <div className="lc-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {pills.length > 0 ? (
                    pills.map((g) => (
                      <span key={g} className="pill-tag">
                        {g}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </div>
                <div style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {h.telefon?.trim() || '—'}
                </div>
                <div
                  style={{
                    color: 'var(--text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h.email?.trim() || '—'}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className="rating" style={{ color: 'var(--text-4)' }}>
                    <MockIcon ctx="default" n="star-filled" size={12} />
                    —
                  </span>
                </div>
                <div className="lc-status">{handwerkerStatusBadge(h)}</div>
                <div
                  className="row-actions always"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  <MockEntityRowMenu items={rowMenuItems(h)} title="Partner" />
                </div>
              </Link>
            )
          })
        )}
      </div>

      <MockPager
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        unit="Partner"
        onPageChange={(p) => setPageIndex(p - 1)}
      />
    </div>
  )
}
