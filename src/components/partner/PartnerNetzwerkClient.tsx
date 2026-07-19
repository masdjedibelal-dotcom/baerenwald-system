'use client'

import Link from 'next/link'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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
import type { EntityMenuItem } from '@/lib/entity-menu'
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

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kategorie', label: 'Kategorie' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
]

const MOCK_KATEGORIEN = ['Versicherung', 'Finanzierung', 'Makler', 'Planung', 'Logistik'] as const
const COLS = '1.6fr 1fr 1.2fr 1.1fr 1.5fr 90px 60px'

type SortCol = 'name' | 'kategorie' | 'ansprechpartner' | 'telefon' | 'email' | 'status'

function partnerExportRow(p: PartnerRow): Record<string, unknown> {
  return {
    name: p.name,
    kategorie: p.partner_kategorien?.name ?? '',
    telefon: p.telefon ?? '',
    email: p.email ?? '',
  }
}

function partnerAktivBadge(p: PartnerRow) {
  return p.aktiv ? (
    <MockBadge kind={hubSpotStatusToMockBadgeKind('order')}>Aktiv</MockBadge>
  ) : (
    <MockBadge kind={hubSpotStatusToMockBadgeKind('cancel')}>Inaktiv</MockBadge>
  )
}

/** @deprecated Positivliste nutzt Kategorie-Badge in der Liste, nicht Partner/Netzwerk-Typ. */
export function PartnerTypBadge(_props: { partner: Pick<PartnerRow, 'partner_typ'> }) {
  return null
}

export function PartnerNetzwerkClient({
  partners,
  kategorien,
}: {
  partners: PartnerRow[]
  kategorien: PartnerKategorie[]
}) {
  const router = useRouter()
  const { exportToCSV } = useExport()

  const [kategorieFilter, setKategorieFilter] = useState('alle')
  const [query, setQuery] = useState('')
  const [fName, setFName] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const kategorieChipOptions = useMemo(() => {
    const byName = new Map(kategorien.map((k) => [k.name.toLowerCase(), k]))
    const opts: { label: string; value: string; count?: number }[] = [
      { label: 'Alle', value: 'alle', count: partners.length },
    ]
    for (const name of MOCK_KATEGORIEN) {
      const kat = byName.get(name.toLowerCase())
      if (kat) {
        opts.push({ label: name, value: kat.id })
      } else {
        opts.push({ label: name, value: `name:${name.toLowerCase()}` })
      }
    }
    for (const k of [...kategorien].sort((a, b) => a.sort_order - b.sort_order)) {
      if (MOCK_KATEGORIEN.some((m) => m.toLowerCase() === k.name.toLowerCase())) continue
      opts.push({ label: k.name, value: k.id })
    }
    return opts
  }, [kategorien, partners])

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const nameNeedle = fName.trim().toLowerCase()
    return partners.filter((p) => {
      if (kategorieFilter !== 'alle') {
        if (kategorieFilter.startsWith('name:')) {
          const n = kategorieFilter.slice(5)
          if (p.partner_kategorien?.name?.toLowerCase() !== n) return false
        } else if (p.kategorie_id !== kategorieFilter) return false
      }
      if (nameNeedle && !p.name.toLowerCase().includes(nameNeedle)) return false
      if (!needle) return true
      const hay = [
        p.name,
        p.partner_kategorien?.name ?? '',
        p.ansprechpartner ?? '',
        p.telefon ?? '',
        p.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [partners, kategorieFilter, query, fName])

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
    const sortKeys: Record<SortCol, (p: PartnerRow) => string> = {
      name: (p) => p.name.toLowerCase(),
      kategorie: (p) => (p.partner_kategorien?.name ?? '').toLowerCase(),
      ansprechpartner: (p) => (p.ansprechpartner ?? '').toLowerCase(),
      telefon: (p) => (p.telefon ?? '').toLowerCase(),
      email: (p) => (p.email ?? '').toLowerCase(),
      status: (p) => (p.aktiv ? 'aktiv' : 'inaktiv'),
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
    (kategorieFilter !== 'alle' ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0)

  function resetFilters() {
    setKategorieFilter('alle')
    setQuery('')
    setFName('')
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))
  const allSelected = filtered.length > 0 && filtered.every((p) => selected[p.id])
  const gridCols = (selectMode ? '40px ' : '') + COLS

  const paginationResetKey = `${kategorieFilter}|${query}|${fName}|${sortCol}|${sortDir}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/partner/${id}`)
  }

  function rowMenuItems(p: PartnerRow): EntityMenuItem[] {
    return [
      { label: 'Öffnen', icon: 'eye', onClick: () => openDetail(p.id) },
      { label: 'Bearbeiten', icon: 'pencil', onClick: () => openDetail(p.id) },
    ]
  }

  const sortDirNum = listSortDirNum(sortDir === 1 ? 'asc' : 'desc')

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {kategorieChipOptions.map((o) => (
            <MockChip
              key={o.value}
              active={kategorieFilter === o.value}
              count={o.count}
              onClick={() => setKategorieFilter(o.value)}
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
                (filtered.length ? filtered : partners).map(partnerExportRow),
                EXPORT_FIELDS,
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
          <MockIcon ctx="default" n="search" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Kategorie, Ansprechpartner…"
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
        <div className="form-section-h">Kategorie</div>
        <div className="chiprow">
          {kategorieChipOptions.map((o) => (
            <MockChip
              key={o.value}
              active={kategorieFilter === o.value}
              onClick={() => setKategorieFilter(o.value)}
            >
              {o.label}
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
                  filtered.forEach((p) => {
                    n[p.id] = true
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
          <MockSortHead
            col="kategorie"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Kategorie
          </MockSortHead>
          <MockSortHead
            col="ansprechpartner"
            sortCol={sortCol}
            sortDir={sortDirNum}
            onSort={(c) => toggleSort(c as SortCol)}
          >
            Ansprechpartner
          </MockSortHead>
          <MockSortHead col="telefon" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Telefon
          </MockSortHead>
          <MockSortHead col="email" sortCol={sortCol} sortDir={sortDirNum} onSort={(c) => toggleSort(c as SortCol)}>
            Email
          </MockSortHead>
          <div>Status</div>
          <div aria-hidden />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="building"
            title={partners.length === 0 ? 'Noch keine Einträge' : 'Keine Treffer'}
            hint="Filter zurücksetzen oder Partner anlegen"
          />
        ) : (
          pageItems.map((p) => (
            <Link
              key={p.id}
              href={`/partner/${p.id}`}
              className={cn('list-row', selected[p.id] && 'sel')}
              style={{ gridTemplateColumns: gridCols }}
              onClick={(e) => {
                if (selectMode) {
                  e.preventDefault()
                  toggleSel(p.id)
                }
              }}
            >
              {selectMode ? (
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSel(p.id)
                  }}
                >
                  <span className={cn('vg-box', selected[p.id] && 'on')}>
                    {selected[p.id] ? <MockIcon ctx="default" n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {p.name}
              </div>
              <div className="lc-pills">
                {p.partner_kategorien?.name ? (
                  <span className="pill-tag">{p.partner_kategorien.name}</span>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {p.ansprechpartner?.trim() || '—'}
              </div>
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
              <div className="lc-status">{partnerAktivBadge(p)}</div>
              <div
                className="row-actions always"
                onClick={(e) => e.stopPropagation()}
                style={{ justifyContent: 'flex-end' }}
              >
                <MockEntityRowMenu items={rowMenuItems(p)} title="Partner" />
              </div>
            </Link>
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
