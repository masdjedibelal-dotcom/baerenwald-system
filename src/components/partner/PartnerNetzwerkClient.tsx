'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ListFilterSection,
  ListMobileStack,
  ListGridShell,
} from '@/components/layout/ListPageParts'
import { EntityListShell, AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { EmptyState } from '@/components/layout/EmptyState'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

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

const PARTNER_EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kategorie', label: 'Kategorie' },
  { key: 'subkategorie', label: 'Subkategorie' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'adresse', label: 'Adresse' },
]

const PARTNER_GRID_COLS = '1.6fr 1fr 1.2fr 1.1fr 1.5fr 90px 60px'

type TypListenFilter = 'alle' | 'partner' | 'netzwerk'

function partnerExportRow(p: PartnerRow): Record<string, unknown> {
  return {
    name: p.name,
    kategorie: p.partner_kategorien?.name ?? '',
    subkategorie: p.subkategorie ?? '',
    telefon: p.telefon ?? '',
    email: p.email ?? '',
    adresse: p.adresse ?? '',
  }
}

function partnerTypLabel(p: PartnerRow): string {
  return (p.partner_typ ?? 'partner') === 'netzwerk' ? 'Netzwerk' : 'Partner'
}

export function PartnerTypBadge({ partner }: { partner: Pick<PartnerRow, 'partner_typ'> }) {
  const isNetzwerk = (partner.partner_typ ?? 'partner') === 'netzwerk'
  return (
    <span
      className={cn(
        'badge badge-no-dot',
        isNetzwerk ? 'bg-violet-50 text-violet-800' : 'bg-bw-green-bg text-bw-primary'
      )}
    >
      {partnerTypLabel(partner as PartnerRow)}
    </span>
  )
}

function partnerAktivBadge(p: PartnerRow) {
  return p.aktiv ? (
    <StatusBadge status="order" label="Aktiv" />
  ) : (
    <StatusBadge status="cancel" label="Inaktiv" />
  )
}

type SortRow = {
  row: PartnerRow
  name: string
  kategorie: string
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
  const { exportToCSV } = useExport()
  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [brancheFilter, setBrancheFilter] = useState('alle')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [exportOpen, setExportOpen] = useState(false)

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const typCounts = useMemo(() => {
    let partner = 0
    let netzwerk = 0
    for (const p of partners) {
      if ((p.partner_typ ?? 'partner') === 'netzwerk') netzwerk++
      else partner++
    }
    return { alle: partners.length, partner, netzwerk }
  }, [partners])

  const imTyp = useMemo(() => {
    if (typFilter === 'alle') return partners
    return partners.filter((p) => (p.partner_typ ?? 'partner') === typFilter)
  }, [partners, typFilter])

  const brancheCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of imTyp) {
      if (!p.kategorie_id) continue
      m.set(p.kategorie_id, (m.get(p.kategorie_id) ?? 0) + 1)
    }
    return m
  }, [imTyp])

  const kategorienMitNutzung = useMemo(() => {
    return [...kategorien].sort((a, b) => a.sort_order - b.sort_order)
  }, [kategorien])

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return imTyp.filter((p) => {
      if (brancheFilter !== 'alle' && p.kategorie_id !== brancheFilter) return false
      if (dateRange && !datumInZeitraum(p.created_at, dateRange)) return false
      if (!needle) return true
      const hay = [
        p.name,
        p.subkategorie ?? '',
        p.partner_kategorien?.name ?? '',
        p.telefon ?? '',
        p.email ?? '',
        p.adresse ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [imTyp, brancheFilter, dateRange, debouncedQ])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((p) => ({
        row: p,
        name: p.name,
        kategorie: p.partner_kategorien?.name ?? '',
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (typFilter !== 'alle') {
      t.push({
        id: 'typ',
        label: typFilter === 'netzwerk' ? 'Netzwerk' : 'Partner',
        onRemove: () => setTypFilter('alle'),
      })
    }
    if (brancheFilter !== 'alle') {
      const label = kategorien.find((k) => k.id === brancheFilter)?.name ?? 'Branche'
      t.push({ id: 'br', label, onRemove: () => setBrancheFilter('alle') })
    }
    if (zeitraum !== 'alle') {
      t.push({
        id: 'z',
        label: zeitraumLabel(zeitraum),
        onRemove: () => {
          setZeitraum('alle')
          setCustomFrom('')
          setCustomTo('')
        },
      })
    }
    if (q.trim()) {
      t.push({ id: 'q', label: q.trim(), onRemove: () => setQ('') })
    }
    return t
  }, [typFilter, brancheFilter, zeitraum, q, kategorien])

  const hasActiveFilters = !!(typFilter !== 'alle' || brancheFilter !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setTypFilter('alle')
    setBrancheFilter('alle')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
    setQ('')
    resetSort()
  }

  function openDetail(id: string) {
    router.push(`/partner/${id}`)
  }

  const isPane = mode === 'pane'

  const sortOptions = [
    { field: 'name', label: 'Name' },
    { field: 'kategorie', label: 'Kategorie' },
  ]

  const typChipOptions = useMemo(
    () => [
      { label: 'Alle', value: 'alle', count: typCounts.alle },
      { label: 'Partner', value: 'partner', count: typCounts.partner },
      { label: 'Netzwerk', value: 'netzwerk', count: typCounts.netzwerk },
    ],
    [typCounts]
  )

  const brancheChipOptions = useMemo(
    () => [
      { label: 'Alle Branchen', value: 'alle', count: imTyp.length },
      ...kategorienMitNutzung.map((k) => ({
        label: k.name,
        value: k.id,
        count: brancheCounts.get(k.id) ?? 0,
      })),
    ],
    [imTyp.length, kategorienMitNutzung, brancheCounts]
  )

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chipGroups={[
          {
            label: 'Typ',
            options: typChipOptions,
            selected: [typFilter],
            onChange: (vals) => {
              setTypFilter((vals[0] as TypListenFilter) || 'alle')
              setBrancheFilter('alle')
            },
          },
          {
            label: 'Branche',
            options: brancheChipOptions,
            selected: [brancheFilter],
            onChange: (vals) => setBrancheFilter(vals[0] || 'alle'),
          },
        ]}
      >
        <ListFilterBar
          hideStatusFilter
          statusLabel="—"
          statusOptions={[{ value: '', label: '—' }]}
          statusValue=""
          onStatusChange={() => {}}
          zeitraumValue={zeitraum}
          onZeitraumChange={setZeitraum}
          showCustomDates={zeitraum === 'benutzerdefiniert'}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Name, Kategorie, Telefon, E-Mail, Adresse"
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          tags={filterTags}
          onExportClick={() => setExportOpen(true)}
          resultCount={filtered.length}
          sort={{
            options: sortOptions,
            currentField: field,
            currentDir: dir,
            onSort: (f) => (f ? handleSort(f) : resetSort()),
          }}
        />
      </ListFilterSection>
      }
    >
      <PageHeader className="hidden md:block" />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title={imTyp.length === 0 ? 'Noch keine Einträge' : 'Keine Treffer'}
          description={
            imTyp.length === 0
              ? 'Erfassen Sie Lieferanten und Partner für Ihr Netzwerk.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {sorted.map(({ row: p }) => (
              <AppEntityListRow
                key={p.id}
                href={isPane ? `/partner/${p.id}` : undefined}
                onClick={isPane ? undefined : () => openDetail(p.id)}
                className={cn(selectedId === p.id && 'ring-2 ring-bw-primary/40')}
                avatar={<ListAvatar name={p.name} />}
                title={p.name}
                line2={p.partner_kategorien?.name ?? '—'}
                line3={
                  [
                    [p.telefon?.trim(), p.email?.trim()].filter(Boolean).join(' · '),
                    p.aktiv ? 'Aktiv' : 'Inaktiv',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'
                }
                line4={p.subkategorie?.trim() || undefined}
                badge={<PartnerTypBadge partner={p} />}
              />
            ))}
          </ListMobileStack>

          <ListGridShell minWidth="880px" className="hidden md:block">
            <div className="list-row-grid head" style={{ gridTemplateColumns: PARTNER_GRID_COLS }}>
              <SortableHeader label="Name" field="name" currentField={field} currentDir={dir} onSort={handleSort} />
              <SortableHeader
                label="Kategorie"
                field="kategorie"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <div>Ansprechpartner</div>
              <div>Telefon</div>
              <div>Email</div>
              <div>Status</div>
              <div aria-hidden />
            </div>
            {sorted.map(({ row: p }) => (
              <Link
                key={p.id}
                href={`/partner/${p.id}`}
                onClick={isPane ? (e) => e.preventDefault() : undefined}
                className={cn(
                  'list-row-grid',
                  selectedId === p.id && isPane && 'ring-2 ring-bw-primary/40'
                )}
                style={{ gridTemplateColumns: PARTNER_GRID_COLS }}
              >
                <p className="list-row-primary truncate">{p.name}</p>
                <div>
                  {p.partner_kategorien?.name ? (
                    <span className="pill-tag">{p.partner_kategorien.name}</span>
                  ) : (
                    <span className="text-[13px] text-bw-text-muted">—</span>
                  )}
                </div>
                <p className="truncate text-[13px] text-bw-text">{p.ansprechpartner?.trim() || '—'}</p>
                <p className="truncate text-[13px] text-bw-text">{p.telefon?.trim() || '—'}</p>
                <p className="truncate text-[13px] text-bw-text">{p.email?.trim() || '—'}</p>
                {partnerAktivBadge(p)}
                <div aria-hidden />
              </Link>
            ))}
          </ListGridShell>
        </>
      )}

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Partner exportieren"
        fields={PARTNER_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : partners
          const data = source.map(partnerExportRow)
          const fields = PARTNER_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'partner')
        }}
      />
    </EntityListShell>
  )
}
