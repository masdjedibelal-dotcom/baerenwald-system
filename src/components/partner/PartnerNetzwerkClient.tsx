'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { runMockListExport } from '@/lib/mock-list-export'
import { deletePartner } from '@/app/(dashboard)/partner/actions'
import { runDuplicatePartner } from '@/lib/list-actions'
import { cn } from '@/lib/utils'

export type PartnerKategorie = {
  id: string
  name: string
  slug: string
  sort_order: number
}

export type PartnerRow = {
  id: string
  name: string
  partner_typ?: 'partner' | 'netzwerk'
  kategorie_id: string | null
  subkategorie: string | null
  ansprechpartner: string | null
  telefon: string | null
  email: string | null
  adresse: string | null
  website: string | null
  notizen: string | null
  aktiv: boolean
  created_at: string | null
  partner_kategorien: { name: string; slug: string; sort_order: number } | null
}

const MOCK_KATS = ['Versicherung', 'Finanzierung', 'Makler', 'Planung', 'Logistik']

const PARTNER_EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kategorie', label: 'Kategorie' },
  { key: 'ansprechpartner', label: 'Ansprechpartner' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'adresse', label: 'Adresse' },
]

const PARTNER_ROW_GRID = '1.6fr 1fr 1.2fr 1.1fr 1.5fr 90px 60px'

type SortCol = 'name' | 'category' | 'contact' | 'tel' | 'mail'

function partnerKategorieName(p: PartnerRow): string {
  return p.partner_kategorien?.name?.trim() || p.subkategorie?.trim() || '—'
}

function partnerExportRow(p: PartnerRow): Record<string, unknown> {
  return {
    name: p.name,
    kategorie: partnerKategorieName(p),
    ansprechpartner: p.ansprechpartner ?? '',
    telefon: p.telefon ?? '',
    email: p.email ?? '',
    adresse: p.adresse ?? '',
  }
}

function partnerTypLabel(p: PartnerRow): string {
  return (p.partner_typ ?? 'partner') === 'netzwerk' ? 'Netzwerk' : 'Partner'
}

function partnerTypBadgeCls(p: PartnerRow): string {
  return (p.partner_typ ?? 'partner') === 'netzwerk'
    ? 'bg-violet-50 text-violet-800'
    : 'bg-bw-green-bg text-bw-primary'
}

export function PartnerTypBadge({ partner }: { partner: Pick<PartnerRow, 'partner_typ'> }) {
  return (
    <span
      className={cn(
        'badge-no-dot inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        partnerTypBadgeCls(partner as PartnerRow)
      )}
    >
      {partnerTypLabel(partner as PartnerRow)}
    </span>
  )
}

function matchesKategorie(p: PartnerRow, kategorie: string): boolean {
  if (kategorie === 'alle') return true
  const name = (p.partner_kategorien?.name ?? p.subkategorie ?? '').toLowerCase()
  return name.includes(kategorie.toLowerCase())
}

export function PartnerNetzwerkClient({
  partners,
  kategorien,
  mode = 'page',
  selectedId = null,
}: {
  partners: PartnerRow[]
  kategorien: PartnerKategorie[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const isPane = mode === 'pane'

  const [query, setQuery] = useState('')
  const [kategorie, setKategorie] = useState('alle')
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const { exportToCSV } = useExport()

  const kategorieChips = useMemo(() => {
    const fromDb = [...kategorien]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((k) => k.name)
    return Array.from(new Set([...MOCK_KATS, ...fromDb]))
  }, [kategorien])

  const activeFilterCount = (kategorie !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return partners.filter((p) => {
      if (!matchesKategorie(p, kategorie)) return false
      if (
        q &&
        !(
          p.name +
          ' ' +
          partnerKategorieName(p) +
          ' ' +
          (p.ansprechpartner ?? '') +
          ' ' +
          (p.telefon ?? '') +
          ' ' +
          (p.email ?? '')
        )
          .toLowerCase()
          .includes(q)
      ) {
        return false
      }
      if (fName && !p.name.toLowerCase().includes(fName.toLowerCase())) return false
      return true
    })
  }, [partners, kategorie, query, fName])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    const dir = sortDir
    const keyFn = (p: PartnerRow): string => {
      switch (sortCol) {
        case 'name':
          return p.name.toLowerCase()
        case 'category':
          return partnerKategorieName(p).toLowerCase()
        case 'contact':
          return (p.ansprechpartner ?? '').toLowerCase()
        case 'tel':
          return p.telefon ?? ''
        case 'mail':
          return (p.email ?? '').toLowerCase()
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
    setKategorie('alle')
    setQuery('')
    setFName('')
  }

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }))
  const selectedCount = Object.values(sel).filter(Boolean).length

  const paginationResetKey = `${kategorie}|${query}|${fName}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    sorted,
    10,
    paginationResetKey
  )

  const rowGrid = (selectMode ? '40px ' : '') + PARTNER_ROW_GRID

  function openDetail(id: string) {
    router.push(`/partner/${id}`)
  }

  const chipItems = ['alle', ...kategorieChips]

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {chipItems.map((k) => (
            <MockChip
              key={k}
              active={kategorie === k}
              onClick={() => setKategorie(k)}
              count={k === 'alle' ? partners.length : undefined}
            >
              {k === 'alle' ? 'Alle' : k}
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
                filtered.map(partnerExportRow),
                PARTNER_EXPORT_FIELDS,
                'partner'
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
          <MockIcon n="search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Kategorie, Ansprechpartner…"
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
        <div className="form-section-h">Kategorie</div>
        <div className="chiprow">
          {chipItems.map((k) => (
            <MockChip key={k} active={kategorie === k} onClick={() => setKategorie(k)}>
              {k === 'alle' ? 'Alle' : k}
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
                const allOn = filtered.length > 0 && filtered.every((p) => sel[p.id])
                if (allOn) setSel({})
                else {
                  const n: Record<string, boolean> = {}
                  filtered.forEach((p) => {
                    n[p.id] = true
                  })
                  setSel(n)
                }
              }}
            >
              <span
                className={cn(
                  'vg-box',
                  filtered.length > 0 && filtered.every((p) => sel[p.id]) && 'on'
                )}
              >
                {filtered.length > 0 && filtered.every((p) => sel[p.id]) ? (
                  <MockIcon n="check" size={12} />
                ) : null}
              </span>
            </div>
          ) : null}
          <MockSortHead col="name" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Name
          </MockSortHead>
          <MockSortHead col="category" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Kategorie
          </MockSortHead>
          <MockSortHead col="contact" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Ansprechpartner
          </MockSortHead>
          <MockSortHead col="tel" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="mail" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <div>Status</div>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="users"
            title={partners.length === 0 ? 'Keine Partner' : 'Keine Treffer'}
            hint={
              partners.length === 0
                ? 'Erfassen Sie Lieferanten und Partner für Ihr Netzwerk.'
                : 'Filter zurücksetzen oder Suche anpassen'
            }
          />
        ) : (
          pageItems.map((p) => (
            <div
              key={p.id}
              className={cn('list-row', sel[p.id] && 'sel', selectedId === p.id && isPane && 'ring-2 ring-[var(--green)]')}
              style={{ gridTemplateColumns: rowGrid }}
              onClick={() => (selectMode ? toggle(p.id) : openDetail(p.id))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectMode ? toggle(p.id) : openDetail(p.id)
                }
              }}
            >
              {selectMode ? (
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(p.id)
                  }}
                >
                  <span className={cn('vg-box', sel[p.id] && 'on')}>
                    {sel[p.id] ? <MockIcon n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {p.name}
              </div>
              <div className="lc-pills">
                <span className="pill-tag">{partnerKategorieName(p)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.ansprechpartner?.trim() || '—'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.telefon?.trim() || '—'}</div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.email?.trim() || '—'}
              </div>
              <div className="lc-status">
                <MockBadge kind={p.aktiv ? 'aktiv' : 'fertig'}>
                  {p.aktiv ? 'Aktiv' : 'Verfügbar'}
                </MockBadge>
              </div>
              <div
                className="row-actions always"
                onClick={(e) => e.stopPropagation()}
                style={{ justifyContent: 'flex-end' }}
              >
                <MockEntityRowMenu
                  items={listEntityMenuItems(
                    'partner',
                    { name: p.name, email: p.email, telefon: p.telefon },
                    {
                      onEdit: () => openDetail(p.id),
                      onCopy: () => runDuplicatePartner(p.id, router),
                      onDelete: () => {
                        void deletePartner(p.id).then((r) => {
                          if (!r.ok) toast.error(r.message)
                          else {
                            toast.success('Partner gelöscht')
                            router.refresh()
                          }
                        })
                      },
                      deleteLabel: p.name,
                    }
                  )}
                  title="Partner"
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
        unit="Partner"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

    </div>
  )
}
