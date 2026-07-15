'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { KundeModal } from '@/components/kunden/KundeModal'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import {
  MockBtn,
  MockChip,
  MockEmpty,
  MockIcon,
  MockModal,
  MockPager,
  MockSortHead,
} from '@/components/mock-ui'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { deleteKunde } from '@/app/actions/kunden'
import { runDuplicateKunde } from '@/lib/list-actions'
import { cn } from '@/lib/utils'

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kundennummer', label: 'Kundennummer' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'typ', label: 'Typ' },
  { key: 'plz', label: 'PLZ' },
  { key: 'ort', label: 'Ort' },
  { key: 'gesamt_umsatz', label: 'Umsatz' },
  { key: 'created_at', label: 'Erstellt am' },
]

const KUNDE_ROW_GRID = '1.4fr 1fr 1.2fr 1.6fr 60px'

type TypListenFilter = 'alle' | 'privat' | 'gewerbe' | 'hausverwaltung'
type SortCol = 'name' | 'type' | 'tel' | 'mail'

function kundeTypLabel(typ: string | null | undefined): string {
  const t = (typ ?? '').toLowerCase()
  if (t === 'gewerbe') return 'Gewerbe'
  if (t === 'hausverwaltung') return 'Hausverwaltung'
  return 'Privat'
}

function kundeTypKey(typ: string | null | undefined): TypListenFilter {
  const t = (typ ?? '').toLowerCase()
  if (t === 'gewerbe') return 'gewerbe'
  if (t === 'hausverwaltung') return 'hausverwaltung'
  return 'privat'
}

function kundeExportRow(k: KundeListeZeile): Record<string, unknown> {
  return {
    name: kundeDisplayName(k),
    kundennummer: k.kundennummer ?? '',
    email: k.email ?? '',
    telefon: k.telefon ?? '',
    typ: kundeTypLabel(k.typ),
    plz: k.plz ?? '',
    ort: k.ort ?? '',
    gesamt_umsatz: k.gesamt_umsatz ?? '',
    created_at: k.created_at,
  }
}

export function KundenListeClient({
  kunden,
  mode = 'page',
  selectedId = null,
}: {
  kunden: KundeListeZeile[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPane = mode === 'pane'

  const [modalOpen, setModalOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
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
    router.replace(q ? `/kunden?${q}` : '/kunden', { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setModalOpen(true)
  }, [searchParams])

  const typCounts = useMemo(() => {
    let privat = 0
    let gewerbe = 0
    let hausverwaltung = 0
    for (const k of kunden) {
      const key = kundeTypKey(k.typ)
      if (key === 'gewerbe') gewerbe++
      else if (key === 'hausverwaltung') hausverwaltung++
      else privat++
    }
    return { alle: kunden.length, privat, gewerbe, hausverwaltung }
  }, [kunden])

  const activeFilterCount =
    (typFilter !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return kunden.filter((k) => {
      if (typFilter !== 'alle' && kundeTypKey(k.typ) !== typFilter) return false
      const name = kundeDisplayName(k)
      if (
        q &&
        !(name + ' ' + (k.telefon ?? '') + ' ' + (k.email ?? '') + ' ' + (k.kundennummer ?? ''))
          .toLowerCase()
          .includes(q)
      ) {
        return false
      }
      if (fName && !name.toLowerCase().includes(fName.toLowerCase())) return false
      return true
    })
  }, [kunden, typFilter, query, fName])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    const dir = sortDir
    const keyFn = (k: KundeListeZeile): string => {
      switch (sortCol) {
        case 'name':
          return kundeDisplayName(k).toLowerCase()
        case 'type':
          return kundeTypLabel(k.typ).toLowerCase()
        case 'tel':
          return k.telefon ?? ''
        case 'mail':
          return (k.email ?? '').toLowerCase()
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
    setTypFilter('alle')
    setQuery('')
    setFName('')
  }

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }))
  const selectedCount = Object.values(sel).filter(Boolean).length

  const paginationResetKey = `${typFilter}|${query}|${fName}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    sorted,
    10,
    paginationResetKey
  )

  const rowGrid = (selectMode ? '40px ' : '') + KUNDE_ROW_GRID

  function openDetail(id: string) {
    router.push(`/kunden/${id}`)
  }

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          <MockChip active={typFilter === 'alle'} onClick={() => setTypFilter('alle')} count={typCounts.alle}>
            Alle
          </MockChip>
          <MockChip active={typFilter === 'privat'} onClick={() => setTypFilter('privat')} count={typCounts.privat}>
            Privat
          </MockChip>
          <MockChip
            active={typFilter === 'hausverwaltung'}
            onClick={() => setTypFilter('hausverwaltung')}
            count={typCounts.hausverwaltung}
          >
            Hausverwaltung
          </MockChip>
          <MockChip active={typFilter === 'gewerbe'} onClick={() => setTypFilter('gewerbe')} count={typCounts.gewerbe}>
            Gewerbe
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
          <MockBtn icon="download" kind="ghost" sm onClick={() => setExportOpen(true)}>
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
          <MockIcon n="search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Telefon, E-Mail…"
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
        <div className="form-section-h">Typ</div>
        <div className="chiprow">
          {(['alle', 'privat', 'hausverwaltung', 'gewerbe'] as const).map((t) => (
            <MockChip key={t} active={typFilter === t} onClick={() => setTypFilter(t)}>
              {t === 'alle' ? 'Alle' : t === 'privat' ? 'Privat' : t === 'hausverwaltung' ? 'Hausverwaltung' : 'Gewerbe'}
            </MockChip>
          ))}
        </div>
      </MockModal>

      <div className={cn('listcard', selectMode && 'vg-selectmode')}>
        <div className="list-row head" style={{ gridTemplateColumns: rowGrid }}>
          {selectMode ? (
            <div
              className="vg-check"
              onClick={(e) => {
                e.stopPropagation()
                const allOn = filtered.length > 0 && filtered.every((k) => sel[k.id])
                if (allOn) setSel({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((k) => {
                    n[k.id] = true
                  })
                  setSel(n)
                }
              }}
            >
              <span
                className={cn(
                  'vg-box',
                  filtered.length > 0 && filtered.every((k) => sel[k.id]) && 'on'
                )}
              >
                {filtered.length > 0 && filtered.every((k) => sel[k.id]) ? (
                  <MockIcon n="check" size={12} />
                ) : null}
              </span>
            </div>
          ) : null}
          <MockSortHead col="name" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Kunde
          </MockSortHead>
          <MockSortHead col="type" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Typ
          </MockSortHead>
          <MockSortHead col="tel" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="mail" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="users"
            title={kunden.length === 0 ? 'Keine Kunden' : 'Keine Treffer'}
            hint={
              kunden.length === 0
                ? 'Lege Kunden an, um sie hier zu verwalten.'
                : 'Filter zurücksetzen oder neuen Kunden anlegen'
            }
          />
        ) : (
          pageItems.map((k) => (
            <div
              key={k.id}
              className={cn('list-row', sel[k.id] && 'sel', selectedId === k.id && isPane && 'ring-2 ring-[var(--green)]')}
              style={{ gridTemplateColumns: rowGrid }}
              onClick={() => (selectMode ? toggle(k.id) : openDetail(k.id))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectMode ? toggle(k.id) : openDetail(k.id)
                }
              }}
            >
              {selectMode ? (
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(k.id)
                  }}
                >
                  <span className={cn('vg-box', sel[k.id] && 'on')}>
                    {sel[k.id] ? <MockIcon n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {kundeDisplayName(k)}
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
                <ActionsMenu
                  trigger={
                    <button type="button" className="qa-btn" title="Aktionen" aria-label="Aktionen">
                      <MockIcon n="dots" size={16} />
                    </button>
                  }
                  items={listEntityMenuItems(
                    'kunde',
                    { name: kundeDisplayName(k), email: k.email, telefon: k.telefon },
                    {
                      onEdit: () => openDetail(k.id),
                      onCopy: () => runDuplicateKunde(k.id, router),
                      onDelete: () => {
                        void deleteKunde(k.id).then((r) => {
                          if (!r.ok) toast.error(r.message)
                          else {
                            toast.success('Kunde gelöscht')
                            router.refresh()
                          }
                        })
                      },
                      deleteLabel: kundeDisplayName(k),
                    }
                  )}
                  sheetTitle="Kunde"
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
        unit="Kunden"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

      <KundeModal open={modalOpen} onClose={closeNeuModal} />

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Kunden exportieren"
        fields={EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : kunden
          const data = source.map(kundeExportRow)
          const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'kunden')
        }}
      />
    </div>
  )
}
