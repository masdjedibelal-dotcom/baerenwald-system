'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SidePanel } from '@/components/ui/SidePanel'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { ComplianceBadge, normalizeComplianceBadgeKey } from '@/components/handwerker/ComplianceBadge'

export type HandwerkerZeile = {
  id: string
  name: string
  firma: string | null
  email: string | null
  telefon: string | null
  gewerke: unknown
  gewerk_namen?: string[]
  compliance_status: string | null
  docs_vorhanden?: number
  pflicht_gesamt?: number
  ist_fachbetrieb?: boolean | null
  created_at: string | null
}

export type GewerkOption = { slug: string; name: string }

function complianceFilterTagLabel(value: string): string {
  if (value === 'ok') return '✓ OK'
  if (value === 'warnung') return '⚠️ Warnung'
  if (value === 'fehlt') return '✗ Fehlt'
  return value
}

const HANDWERKER_EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'firma', label: 'Firma' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'compliance_status', label: 'Compliance' },
]

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
    name: h.name,
    firma: h.firma ?? '',
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

export function HandwerkerListeClient({
  rows,
  gewerkeOptionen,
  einsatzFilterAktiv = false,
}: {
  rows: HandwerkerZeile[]
  gewerkeOptionen: GewerkOption[]
  einsatzFilterAktiv?: boolean
}) {
  const { exportToCSV } = useExport()
  const [panel, setPanel] = useState<HandwerkerZeile | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [gewerkChip, setGewerkChip] = useState('alle')
  const [complianceFilter, setComplianceFilter] = useState('alle')
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortField, setSortField] = useState<'name' | 'gewerk' | 'compliance'>('name')

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((h) => {
      if (gewerkChip !== 'alle') {
        const names = (h.gewerk_namen ?? []).map((x) => x.toLowerCase())
        const slug = gewerkChip.toLowerCase()
        const opt = gewerkeOptionen.find((g) => g.slug === gewerkChip)
        const matchName = opt ? names.some((n) => n.includes(opt.name.toLowerCase())) : false
        const matchSlug = names.some((n) => n.includes(slug)) || gewerkeStrRaw(h.gewerke).toLowerCase().includes(slug)
        if (!matchName && !matchSlug) return false
      }
      if (complianceFilter !== 'alle') {
        const k = normalizeComplianceBadgeKey(h.compliance_status)
        if (complianceFilter === 'ok' && k !== 'ok') return false
        if (complianceFilter === 'warnung' && k !== 'bald_ablaufend') return false
        if (complianceFilter === 'fehlt' && k === 'ok') return false
        if (complianceFilter === 'fehlt' && k === 'bald_ablaufend') return false
      }
      if (dateRange && !datumInZeitraum(h.created_at, dateRange)) return false
      if (!needle) return true
      const pool = [h.name, h.firma ?? '', h.email ?? '', h.telefon ?? '', gewerkeStr(h)]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [rows, gewerkChip, complianceFilter, q, dateRange, gewerkeOptionen])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name, 'de')
      if (sortField === 'compliance') return complianceRank(a) - complianceRank(b)
      const ga = gewerkeStr(a)
      const gb = gewerkeStr(b)
      return ga.localeCompare(gb, 'de')
    })
    return copy
  }, [filtered, sortField])

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (gewerkChip !== 'alle') {
      const label = gewerkeOptionen.find((g) => g.slug === gewerkChip)?.name ?? gewerkChip
      t.push({ id: 'gw', label, onRemove: () => setGewerkChip('alle') })
    }
    if (complianceFilter !== 'alle') {
      t.push({
        id: 'co',
        label: complianceFilterTagLabel(complianceFilter),
        onRemove: () => setComplianceFilter('alle'),
      })
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
  }, [gewerkChip, complianceFilter, zeitraum, q, gewerkeOptionen])

  const hasActiveFilters = !!(
    gewerkChip !== 'alle' ||
    complianceFilter !== 'alle' ||
    zeitraum !== 'alle' ||
    q.trim()
  )

  function resetFilters() {
    setGewerkChip('alle')
    setComplianceFilter('alle')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  const gewerkChipOptions = useMemo(
    () => [{ label: 'Alle', value: 'alle' }, ...gewerkeOptionen.map((g) => ({ label: g.name, value: g.slug }))],
    [gewerkeOptionen]
  )

  return (
    <div>
      {einsatzFilterAktiv ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bw-border bg-bw-bg px-4 py-2 text-sm text-bw-text">
          <span>Nur Handwercher mit Auftrag (Status zugewiesen oder in Arbeit).</span>
          <Link
            href="/handwerker"
            className="whitespace-nowrap text-sm font-medium text-bw-link hover:underline"
          >
            Alle Handwercher anzeigen
          </Link>
        </div>
      ) : null}

      <PageHeader
        title="Handwerker"
        action={
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 text-sm font-medium text-bw-text shadow-sm transition-colors hover:bg-bw-hover"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export
          </button>
        }
      />

      <div className="sticky top-14 z-10 -mx-4 border-b border-bw-border bg-bw-bg px-4 py-3 md:-mx-6 md:px-6">
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
          className="mb-0"
        />

        <div className="mt-3 flex flex-col gap-2">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-bw-text-muted">Gewerk</p>
            <FilterChips
              options={gewerkChipOptions}
              selected={gewerkChip === 'alle' ? [] : [gewerkChip]}
              onChange={(v) => setGewerkChip(v[0] ?? 'alle')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">Compliance</span>
            <select
              id="handwerker-compliance-filter"
              aria-label="Compliance-Filter"
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="input w-auto min-w-[8.5rem] text-sm"
            >
              <option value="alle">Alle</option>
              <option value="ok">✓ OK</option>
              <option value="warnung">⚠️ Warnung</option>
              <option value="fehlt">✗ Fehlt</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <MobileSortSelect
          options={[
            { field: 'name', label: 'Name' },
            { field: 'gewerk', label: 'Gewerk' },
            { field: 'compliance', label: 'Compliance' },
          ]}
          currentField={sortField}
          currentDir="asc"
          onSort={(f) => {
            if (!f) setSortField('name')
            else if (f === 'name' || f === 'gewerk' || f === 'compliance') setSortField(f)
          }}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title={rows.length === 0 ? 'Keine Handwerker' : 'Keine Treffer'}
          description={
            rows.length === 0
              ? 'Lege Handwercher an, um sie hier zu verwalten.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden md:hidden">
            {sorted.map((h) => (
              <ListCard
                key={h.id}
                title={h.name}
                badge={<ComplianceBadge status={h.compliance_status} />}
                subtitle={(h.gewerk_namen ?? []).join(' · ') || gewerkeStrRaw(h.gewerke)}
                meta={h.firma || h.telefon || ''}
                onClick={() => setPanel(h)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-bw-border bg-bw-card shadow-card md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-bg text-muted">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Firma</th>
                  <th className="px-3 py-3 font-medium">Gewerke</th>
                  <th className="px-3 py-3 font-medium">Compliance</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
                  <tr
                    key={h.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover"
                    onClick={() => setPanel(h)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setPanel(h)
                    }}
                  >
                    <td className="px-3 py-3 font-medium text-ink">{h.name}</td>
                    <td className="px-3 py-3 text-muted">{h.firma ?? '—'}</td>
                    <td className="max-w-[220px] px-3 py-3 text-xs text-muted">
                      {(h.gewerk_namen ?? []).join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <ComplianceBadge status={h.compliance_status} />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/handwerker/${h.id}`}
                        className="text-bw-link hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Seite
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SidePanel
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.name ?? ''}
        subtitle={panel?.firma ?? undefined}
        width="md"
      >
        {panel ? (
          <div className="space-y-4 p-5 text-sm">
            <div>
              <div className="text-lg font-semibold text-bw-text">{panel.name}</div>
              {panel.firma ? <div className="text-sm text-bw-text-muted">{panel.firma}</div> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ComplianceBadge status={panel.compliance_status} />
                <span className="text-xs text-bw-text-muted">
                  {panel.docs_vorhanden ?? 0}/{panel.pflicht_gesamt ?? 0} Dokumente
                </span>
              </div>
            </div>
            {(panel.gewerk_namen ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(panel.gewerk_namen ?? []).map((g, i) => (
                  <span key={`${g}-${i}`} className="chip selected text-xs">
                    {g}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="space-y-1">
              {panel.telefon ? (
                <a href={`tel:${panel.telefon}`} className="flex py-1 text-bw-link">
                  📞 {panel.telefon}
                </a>
              ) : null}
              {panel.email ? (
                <a href={`mailto:${panel.email}`} className="flex truncate py-1 text-bw-link">
                  ✉️ {panel.email}
                </a>
              ) : null}
            </div>
            <div className="border-t border-bw-border pt-2">
              <Link
                href={`/handwerker/${panel.id}`}
                className="btn btn-secondary btn-sm inline-flex w-full justify-center"
                onClick={() => setPanel(null)}
              >
                Zum Handwercher →
              </Link>
            </div>
          </div>
        ) : null}
      </SidePanel>

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={HANDWERKER_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? sorted : rows
          const data = source.map(handwerkerExportRow)
          const fields = HANDWERKER_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'handwerker')
        }}
      />
    </div>
  )
}
