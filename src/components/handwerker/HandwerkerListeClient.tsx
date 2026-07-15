'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { HandwerkerModal } from '@/components/handwerker/HandwerkerModal'
import { normalizeComplianceBadgeKey } from '@/components/handwerker/ComplianceBadge'
import { toast } from '@/components/ui/app-toast'
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
import { handwerkerDisplayName } from '@/lib/handwerker-stammdaten'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { runMockListExport } from '@/lib/mock-list-export'
import { deleteHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { runDuplicateHandwerker } from '@/lib/list-actions'
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

const MOCK_GEWERK_CHIPS = ['Sanitär', 'Elektrik', 'Fliesen', 'Maler', 'Boden']

const HANDWERKER_EXPORT_FIELDS: ExportField[] = [
  { key: 'firma', label: 'Firmenname' },
  { key: 'vorname', label: 'Vorname GF' },
  { key: 'nachname', label: 'Nachname GF' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'compliance_status', label: 'Compliance' },
]

const HW_ROW_GRID =
  'minmax(120px,1.6fr) minmax(90px,1fr) 118px minmax(120px,1.6fr) 72px 96px 40px'

function gewerkeStr(h: HandwerkerZeile): string {
  return h.gewerk_namen?.length ? h.gewerk_namen.join(', ') : ''
}

function handwerkerExportRow(h: HandwerkerZeile): Record<string, unknown> {
  return {
    firma: h.firma ?? '',
    vorname: h.vorname ?? '',
    nachname: h.nachname ?? '',
    telefon: h.telefon ?? '',
    email: h.email ?? '',
    gewerke: gewerkeStr(h),
    compliance_status: h.compliance_status ?? '',
    created_at: h.created_at ?? '',
  }
}

function matchesGewerk(h: HandwerkerZeile, gewerk: string): boolean {
  if (gewerk === 'alle') return true
  const names = (h.gewerk_namen ?? []).map((n) => n.toLowerCase())
  const needle = gewerk.toLowerCase()
  return names.some((n) => n.includes(needle))
}

type SortCol = 'name' | 'category' | 'tel' | 'mail' | 'rating' | 'status'

export function HandwerkerListeClient({
  rows,
  gewerkeOptionen,
  mode = 'page',
  selectedId = null,
}: {
  rows: HandwerkerZeile[]
  gewerkeOptionen: GewerkOption[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPane = mode === 'pane'

  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [gewerk, setGewerk] = useState('alle')
  const [compOnly, setCompOnly] = useState(false)
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const { exportToCSV } = useExport()

  function closeNeuModal() {
    setModalOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('neu')
    const q = params.toString()
    router.replace(q ? `/handwerker?${q}` : '/handwerker', { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setModalOpen(true)
  }, [searchParams])

  const gewerkChips = useMemo(() => {
    const fromDb = gewerkeOptionen.map((g) => g.name).slice(0, 5)
    const merged = Array.from(new Set([...MOCK_GEWERK_CHIPS, ...fromDb])).slice(0, 5)
    return merged
  }, [gewerkeOptionen])

  const compReviewCount = useMemo(
    () => rows.filter((t) => normalizeComplianceBadgeKey(t.compliance_status) !== 'ok').length,
    [rows]
  )

  const activeFilterCount =
    (gewerk !== 'alle' ? 1 : 0) + (compOnly ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((t) => {
      if (!matchesGewerk(t, gewerk)) return false
      if (compOnly && normalizeComplianceBadgeKey(t.compliance_status) === 'ok') return false
      const name = handwerkerDisplayName(t)
      if (q && !(name + ' ' + gewerkeStr(t) + ' ' + (t.telefon ?? '') + ' ' + (t.email ?? '')).toLowerCase().includes(q)) {
        return false
      }
      if (fName && !name.toLowerCase().includes(fName.toLowerCase())) return false
      return true
    })
  }, [rows, gewerk, compOnly, query, fName])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    const dir = sortDir
    const keyFn = (t: HandwerkerZeile): string | number => {
      switch (sortCol) {
        case 'name':
          return handwerkerDisplayName(t).toLowerCase()
        case 'category':
          return gewerkeStr(t).toLowerCase()
        case 'tel':
          return t.telefon ?? ''
        case 'mail':
          return (t.email ?? '').toLowerCase()
        case 'rating':
          return 0
        case 'status':
          return t.aktiver_einsatz ? 1 : 0
        default:
          return ''
      }
    }
    return [...filtered].sort((a, b) => {
      const av = keyFn(a)
      const bv = keyFn(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filtered, sortCol, sortDir])

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

  const resetFilters = () => {
    setGewerk('alle')
    setCompOnly(false)
    setQuery('')
    setFName('')
  }

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }))
  const selectedCount = Object.values(sel).filter(Boolean).length

  const paginationResetKey = `${gewerk}|${compOnly}|${query}|${fName}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    sorted,
    10,
    paginationResetKey
  )

  const rowGrid = (selectMode ? '40px ' : '') + HW_ROW_GRID

  function openDetail(id: string) {
    router.push(`/handwerker/${id}`)
  }

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          <MockChip active={gewerk === 'alle'} onClick={() => setGewerk('alle')} count={rows.length}>
            Alle Gewerke
          </MockChip>
          {gewerkChips.map((g) => (
            <MockChip key={g} active={gewerk === g} onClick={() => setGewerk(g)}>
              {g}
            </MockChip>
          ))}
          <MockChip
            active={compOnly}
            icon="alert-triangle"
            count={compReviewCount}
            onClick={() => setCompOnly((v) => !v)}
          >
            Compliance
          </MockChip>
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
              setSel({})
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
                filtered.map(handwerkerExportRow),
                HANDWERKER_EXPORT_FIELDS,
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
          <MockIcon n="search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Gewerk, Telefon, E-Mail…"
            autoFocus
          />
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label className="field">
            <span className="field-lbl">Name</span>
            <input
              className="txt"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder="Name enthält…"
            />
          </label>
        </div>
        <div className="form-section-h">Gewerk</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {['alle', ...gewerkChips].map((g) => (
            <MockChip key={g} active={gewerk === g} onClick={() => setGewerk(g)}>
              {g === 'alle' ? 'Alle' : g}
            </MockChip>
          ))}
        </div>
        <div className="form-section-h">Compliance</div>
        <div className="chiprow">
          <MockChip active={!compOnly} onClick={() => setCompOnly(false)}>
            Alle
          </MockChip>
          <MockChip active={compOnly} onClick={() => setCompOnly(true)}>
            Nur zu prüfen
          </MockChip>
        </div>
      </MockModal>

      <div className={cn('listcard', selectMode && 'vg-selectmode')}>
        <div className="list-row head" style={{ gridTemplateColumns: rowGrid }}>
          {selectMode ? (
            <div
              className="vg-check"
              onClick={(e) => {
                e.stopPropagation()
                const allOn = filtered.length > 0 && filtered.every((t) => sel[t.id])
                if (allOn) setSel({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((t) => {
                    n[t.id] = true
                  })
                  setSel(n)
                }
              }}
            >
              <span
                className={cn(
                  'vg-box',
                  filtered.length > 0 && filtered.every((t) => sel[t.id]) && 'on'
                )}
              >
                {filtered.length > 0 && filtered.every((t) => sel[t.id]) ? (
                  <MockIcon n="check" size={12} />
                ) : null}
              </span>
            </div>
          ) : null}
          <MockSortHead col="name" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Name
          </MockSortHead>
          <MockSortHead col="category" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Gewerk
          </MockSortHead>
          <MockSortHead col="tel" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="mail" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <MockSortHead
            col="rating"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            right
          >
            Bewertung
          </MockSortHead>
          <MockSortHead col="status" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Status
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="tool"
            title={rows.length === 0 ? 'Keine Handwerker' : 'Keine Treffer'}
            hint={
              rows.length === 0
                ? 'Lege Handwerker an, um sie hier zu verwalten.'
                : 'Filter zurücksetzen oder neuen Handwerker anlegen'
            }
          />
        ) : (
          pageItems.map((t) => (
            <div
              key={t.id}
              className={cn('list-row', sel[t.id] && 'sel', selectedId === t.id && isPane && 'ring-2 ring-[var(--green)]')}
              style={{ gridTemplateColumns: rowGrid }}
              onClick={() => (selectMode ? toggle(t.id) : openDetail(t.id))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectMode ? toggle(t.id) : openDetail(t.id)
                }
              }}
            >
              {selectMode ? (
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(t.id)
                  }}
                >
                  <span className={cn('vg-box', sel[t.id] && 'on')}>
                    {sel[t.id] ? <MockIcon n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {handwerkerDisplayName(t)}
              </div>
              <div className="lc-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(t.gewerk_namen ?? []).length ? (
                  (t.gewerk_namen ?? []).map((g, i) => (
                    <span key={i} className="pill-tag">
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="pill-tag">—</span>
                )}
              </div>
              <div style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{t.telefon?.trim() || '—'}</div>
              <div
                style={{
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.email?.trim() || '—'}
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                —
              </div>
              <div className="lc-status">
                <MockBadge kind={t.aktiver_einsatz ? 'aktiv' : 'fertig'}>
                  {t.aktiver_einsatz ? 'Aktiv' : 'Verfügbar'}
                </MockBadge>
              </div>
              <div
                className="row-actions always"
                onClick={(e) => e.stopPropagation()}
                style={{ justifyContent: 'flex-end' }}
              >
                <MockEntityRowMenu
                  items={listEntityMenuItems(
                    'handwerker',
                    { name: handwerkerDisplayName(t), email: t.email, telefon: t.telefon },
                    {
                      onEdit: () => openDetail(t.id),
                      onCopy: () => runDuplicateHandwerker(t.id, router),
                      onDelete: () => {
                        void deleteHandwerker(t.id).then((r) => {
                          if (!r.ok) toast.error(r.message)
                          else {
                            toast.success('Handwerker gelöscht')
                            router.refresh()
                          }
                        })
                      },
                      deleteLabel: handwerkerDisplayName(t),
                    }
                  )}
                  title="Handwerker"
                />
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
