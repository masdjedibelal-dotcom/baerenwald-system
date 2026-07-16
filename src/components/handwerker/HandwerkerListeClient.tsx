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
import type { EntityMenuItem } from '@/lib/entity-menu'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { HandwerkerModal } from '@/components/handwerker/HandwerkerModal'
import { normalizeComplianceBadgeKey } from '@/components/handwerker/ComplianceBadge'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { listSortDirNum } from '@/lib/list-mock-sort'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'

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
const GRID_COLS = 'minmax(120px,1.6fr) minmax(90px,1fr) 118px minmax(120px,1.6fr) 72px 96px 40px'

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
  if (h.aktiver_einsatz) return <StatusBadge status="order" label="Aktiv" />
  return <StatusBadge status="done" label="Verfügbar" />
}

function resolveGewerkChipValue(name: string, gewerkeOptionen: GewerkOption[]): string {
  const opt = gewerkeOptionen.find(
    (g) => g.name.toLowerCase() === name.toLowerCase() || g.slug === name.toLowerCase()
  )
  return opt?.slug ?? name.toLowerCase()
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

  const [modalOpen, setModalOpen] = useState(false)
  const [gewerkChip, setGewerkChip] = useState('alle')
  const [query, setQuery] = useState('')
  const [nurZuPruefen, setNurZuPruefen] = useState(false)
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
    router.replace(q ? `/handwerker?${q}` : '/handwerker', { scroll: false })
  }

  function openNeuModal() {
    setModalOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('neu', '1')
    router.replace(`/handwerker?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setModalOpen(true)
  }, [searchParams])

  const gewerkChipOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: 'Alle Gewerke', value: 'alle' }]
    for (const name of MOCK_GEWERK_NAMES) {
      opts.push({ label: name, value: resolveGewerkChipValue(name, gewerkeOptionen) })
    }
    opts.push({ label: 'Compliance', value: 'compliance' })
    return opts
  }, [gewerkeOptionen])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((h) => {
      if (gewerkChip === 'compliance') {
        if (!isComplianceNichtOk(h)) return false
      } else if (gewerkChip !== 'alle') {
        const names = (h.gewerk_namen ?? []).map((x) => x.toLowerCase())
        const opt = gewerkeOptionen.find((g) => g.slug === gewerkChip)
        const matchName = opt ? names.some((n) => n.includes(opt.name.toLowerCase())) : false
        const matchSlug =
          names.some((n) => n.includes(gewerkChip)) ||
          gewerkeStrRaw(h.gewerke).toLowerCase().includes(gewerkChip)
        if (!matchName && !matchSlug) return false
      }
      if (nurZuPruefen && !isComplianceNichtOk(h)) return false
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
  }, [rows, gewerkChip, nurZuPruefen, query, gewerkeOptionen])

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
    (gewerkChip !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (nurZuPruefen ? 1 : 0)

  function resetFilters() {
    setGewerkChip('alle')
    setQuery('')
    setNurZuPruefen(false)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const paginationResetKey = `${gewerkChip}|${query}|${nurZuPruefen}|${sortCol}|${sortDir}`
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
      {
        label: 'Öffnen',
        icon: 'eye',
        onClick: () => openDetail(h.id),
      },
      {
        label: 'Bearbeiten',
        icon: 'pencil',
        onClick: () => openDetail(h.id),
      },
    ]
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {gewerkChipOptions.map((o) => (
            <MockChip key={o.value} active={gewerkChip === o.value} onClick={() => setGewerkChip(o.value)}>
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
        sub="Handwerker eingrenzen"
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
        <div className="form-section-h">Compliance</div>
        <div className="chiprow">
          <MockChip active={nurZuPruefen} onClick={() => setNurZuPruefen((v) => !v)}>
            Nur zu prüfen
          </MockChip>
        </div>
      </MockModal>

      <div className="listcard">
        <div className="list-row-grid head" style={{ gridTemplateColumns: GRID_COLS }}>
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
          <MockSortHead col="bewertung" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
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
            title={rows.length === 0 ? 'Keine Handwerker' : 'Keine Treffer'}
            hint={rows.length === 0 ? 'Handwerker anlegen' : 'Filter zurücksetzen'}
          />
        ) : (
          pageItems.map((h) => {
            const gewerke = h.gewerk_namen ?? []
            const gewerkeFallback = gewerke.length === 0 ? gewerkeStr(h) : ''
            return (
              <div
                key={h.id}
                role="button"
                tabIndex={0}
                className={`list-row-grid${selectMode && selected[h.id] ? ' sel' : ''}`}
                style={{ gridTemplateColumns: GRID_COLS }}
                onClick={() => (selectMode ? toggleSel(h.id) : openDetail(h.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectMode ? toggleSel(h.id) : openDetail(h.id)
                  }
                }}
              >
                <p className="list-row-primary truncate">{handwerkerDisplayName(h)}</p>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {gewerke.length > 0 ? (
                    gewerke.slice(0, 3).map((g) => (
                      <span key={g} className="pill-tag">
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="truncate text-[13px] text-bw-text-muted">
                      {gewerkeFallback || '—'}
                    </span>
                  )}
                </div>
                <p className="truncate whitespace-nowrap text-[13px] text-bw-text">
                  {h.telefon?.trim() || '—'}
                </p>
                <p className="truncate text-[13px] text-bw-text">{h.email?.trim() || '—'}</p>
                <p className="text-center text-[13px] text-bw-text-muted">—</p>
                {handwerkerStatusBadge(h)}
                <div className="vg-actions" onClick={(e) => e.stopPropagation()}>
                  <MockEntityRowMenu items={rowMenuItems(h)} title="Handwerker" />
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
        unit="Handwerker"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

      <HandwerkerModal
        open={modalOpen}
        onClose={closeNeuModal}
        gewerkeOptionen={gewerkeOptionen}
        onSaved={(id) => {
          closeNeuModal()
          router.push(`/handwerker/${id}`)
          router.refresh()
        }}
      />
    </div>
  )
}
