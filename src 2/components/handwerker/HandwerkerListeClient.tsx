'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
import { SortableHeader } from '@/components/ui/SortableHeader'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { ComplianceBadge, normalizeComplianceBadgeKey } from '@/components/handwerker/ComplianceBadge'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'
import { HandwerkerModal } from '@/components/handwerker/HandwerkerModal'
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

const HANDWERKER_EXPORT_FIELDS: ExportField[] = [
  { key: 'firma', label: 'Firmenname' },
  { key: 'vorname', label: 'Vorname GF' },
  { key: 'nachname', label: 'Nachname GF' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'compliance_status', label: 'Compliance' },
]

const HANDWERKER_GRID_COLS =
  '42px minmax(180px,1.5fr) minmax(140px,1fr) minmax(180px,1.2fr) 100px'

function gewerkeStr(h: HandwerkerZeile): string {
  const n = h.gewerk_namen?.length ? h.gewerk_namen.join(', ') : gewerkeStrRaw(h.gewerke)
  return n
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

function complianceRank(h: HandwerkerZeile): number {
  const k = normalizeComplianceBadgeKey(h.compliance_status)
  if (k === 'ok') return 0
  if (k === 'bald_ablaufend') return 1
  if (k === 'unvollstaendig') return 2
  return 3
}

function dokumenteKurzlabel(h: HandwerkerZeile): string {
  const n = h.docs_vorhanden ?? 0
  return n === 1 ? '1 Dokument' : `${n} Dokumente`
}

type SortRow = {
  row: HandwerkerZeile
  name: string
  gewerk: string
  compliance: number
}

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
  const einsatzFilterAktiv = searchParams.get('filter') === 'einsatz'
  const isPane = mode === 'pane'

  const [modalOpen, setModalOpen] = useState(false)

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

  const listRows = useMemo(() => {
    if (!einsatzFilterAktiv) return rows
    return rows.filter((h) => h.aktiver_einsatz)
  }, [rows, einsatzFilterAktiv])
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [gewerkChip, setGewerkChip] = useState('alle')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return listRows.filter((h) => {
      if (gewerkChip !== 'alle') {
        const names = (h.gewerk_namen ?? []).map((x) => x.toLowerCase())
        const slug = gewerkChip.toLowerCase()
        const opt = gewerkeOptionen.find((g) => g.slug === gewerkChip)
        const matchName = opt ? names.some((n) => n.includes(opt.name.toLowerCase())) : false
        const matchSlug = names.some((n) => n.includes(slug)) || gewerkeStrRaw(h.gewerke).toLowerCase().includes(slug)
        if (!matchName && !matchSlug) return false
      }
      if (dateRange && !datumInZeitraum(h.created_at, dateRange)) return false
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
  }, [listRows, gewerkChip, debouncedQ, dateRange, gewerkeOptionen])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((h) => ({
        row: h,
        name: handwerkerDisplayName(h),
        gewerk: gewerkeStr(h),
        compliance: complianceRank(h),
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (gewerkChip !== 'alle') {
      const label = gewerkeOptionen.find((g) => g.slug === gewerkChip)?.name ?? gewerkChip
      t.push({ id: 'gw', label, onRemove: () => setGewerkChip('alle') })
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
  }, [gewerkChip, zeitraum, q, gewerkeOptionen])

  const hasActiveFilters = !!(gewerkChip !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setGewerkChip('alle')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
    resetSort()
  }

  function openDetail(id: string) {
    router.push(`/handwerker/${id}`)
  }

  const gewerkChipOptions = useMemo(
    () => [{ label: 'Alle', value: 'alle' }, ...gewerkeOptionen.map((g) => ({ label: g.name, value: g.slug }))],
    [gewerkeOptionen]
  )

  const sortOptions = [
    { field: 'name', label: 'Firma' },
    { field: 'gewerk', label: 'Gewerk' },
    { field: 'compliance', label: 'Compliance' },
  ]

  return (
    <EntityListShell
      mode={mode}
      filters={
        <>
          {einsatzFilterAktiv ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bw-border bg-bw-card px-4 py-3 text-sm text-bw-text shadow-sm">
              <span>Nur Handwercher mit Auftrag (Status zugewiesen oder in Arbeit).</span>
              <Link
                href="/handwerker"
                className="whitespace-nowrap text-sm font-medium text-bw-link hover:underline"
              >
                Alle Handwercher anzeigen
              </Link>
            </div>
          ) : null}

          <ListFilterSection
            chipGroups={[
              {
                label: 'Gewerk',
                options: gewerkChipOptions,
                selected: [gewerkChip],
                onChange: (v) => setGewerkChip(v[0] ?? 'alle'),
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
              searchPlaceholder="Name, Firma, E-Mail, Telefon"
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
              toolbarEnd={
                <select
                  aria-label="Sortieren"
                  value={field ?? ''}
                  onChange={(e) => (e.target.value ? handleSort(e.target.value) : resetSort())}
                  className="list-filter-select hidden md:block"
                >
                  <option value="">Sortieren</option>
                  {sortOptions.map((o) => (
                    <option key={o.field} value={o.field}>
                      {o.label}
                    </option>
                  ))}
                </select>
              }
            />
          </ListFilterSection>
        </>
      }
    >
      {!isPane ? <PageHeader className="hidden md:block" /> : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title={listRows.length === 0 ? 'Keine Handwerker' : 'Keine Treffer'}
          description={
            rows.length === 0
              ? 'Lege Handwerker an, um sie hier zu verwalten.'
              : 'Passe Filter oder Suche an.'
          }
          action={
            rows.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={openNeuModal}>
                + Ersten Handwerker anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ListMobileStack
            className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}
          >
            {sorted.map(({ row: h }) => {
              const gewerkeLabel = (h.gewerk_namen ?? []).slice(0, 3).join(', ') || '—'
              return (
                <AppEntityListRow
                  key={h.id}
                  href={isPane ? `/handwerker/${h.id}` : undefined}
                  onClick={isPane ? undefined : () => openDetail(h.id)}
                  className={cn(selectedId === h.id && 'ring-2 ring-bw-primary/40')}
                  avatar={<ListAvatar name={handwerkerDisplayName(h)} />}
                  title={handwerkerDisplayName(h)}
                  line2={handwerkerGfName(h) || gewerkeLabel}
                  line3={
                    [h.telefon?.trim(), h.email?.trim()].filter(Boolean).join(' · ') || '—'
                  }
                  line4={dokumenteKurzlabel(h)}
                  badge={<ComplianceBadge status={h.compliance_status} />}
                />
              )
            })}
          </ListMobileStack>

          <ListGridShell
            minWidth="880px"
            className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}
          >
            <div className="list-row-grid head" style={{ gridTemplateColumns: HANDWERKER_GRID_COLS }}>
              <div />
              <SortableHeader label="Firma" field="name" currentField={field} currentDir={dir} onSort={handleSort} />
              <div>Geschäftsführer</div>
              <SortableHeader label="Gewerke" field="gewerk" currentField={field} currentDir={dir} onSort={handleSort} />
              <SortableHeader
                label="Compliance"
                field="compliance"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
            </div>
            {sorted.map(({ row: h }) => (
              <div
                key={h.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(h.id)
                  }
                }}
                className={cn(
                  'list-row-grid',
                  selectedId === h.id && isPane && 'ring-2 ring-bw-primary/40'
                )}
                style={{ gridTemplateColumns: HANDWERKER_GRID_COLS }}
              >
                <ListAvatar name={handwerkerDisplayName(h)} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-bw-text">
                    {handwerkerDisplayName(h)}
                  </p>
                  <p className="truncate text-xs text-bw-text-muted">
                    {[h.telefon?.trim(), h.email?.trim()].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <p className="truncate text-[13px] text-bw-text">{handwerkerGfName(h) || '—'}</p>
                <p className="truncate text-[12.5px] text-bw-text-muted">
                  {(h.gewerk_namen ?? []).join(' · ') || '—'}
                </p>
                <ComplianceBadge status={h.compliance_status} />
              </div>
            ))}
          </ListGridShell>
        </>
      )}

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

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Handwerker exportieren"
        fields={HANDWERKER_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : listRows
          const data = source.map(handwerkerExportRow)
          const fields = HANDWERKER_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'handwerker')
        }}
      />
    </EntityListShell>
  )
}
