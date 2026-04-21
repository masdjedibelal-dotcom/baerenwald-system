'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { AngebotSidePanel } from '@/components/angebote/AngebotSidePanel'
import {
  ANGEBOT_STATUS_LABELS,
  BEREICH_LABELS,
  formatLeadListDatum,
  formatPreis,
  formatRelativeDate,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  getZeitraumRange,
  datumInZeitraum,
  ZEITRAUM_OPTIONS,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import type { AngebotListeEintrag, AngebotStatus } from '@/lib/types'

type AngebotFilterKey = '' | 'entwurf' | 'bei_hw' | 'bei_kunde' | 'angenommen' | 'abgelehnt'

const FILTER_ORDER: AngebotFilterKey[] = [
  '',
  'entwurf',
  'bei_hw',
  'bei_kunde',
  'angenommen',
  'abgelehnt',
]

const FILTER_LABELS: Record<AngebotFilterKey, string> = {
  '': 'Alle',
  entwurf: 'Entwurf',
  bei_hw: 'Beim Handwerker',
  bei_kunde: 'Beim Kunden',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
}

function matchesStatusFilter(a: AngebotListeEintrag, key: AngebotFilterKey): boolean {
  if (!key) return true
  const s = a.status
  if (key === 'entwurf') return s === 'entwurf'
  if (key === 'bei_hw') return s === 'gesendet_handwerker' || s === 'handwerker_akzeptiert'
  if (key === 'bei_kunde') return s === 'gesendet_kunde'
  if (key === 'angenommen') return s === 'kunde_akzeptiert'
  if (key === 'abgelehnt') return s === 'abgelehnt'
  return true
}

function kundenName(a: AngebotListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

function gewerkeTags(a: AngebotListeEintrag, max = 3) {
  const names = Array.from(
    new Set((a.positionen ?? []).map((p) => p.gewerk_name).filter(Boolean) as string[])
  )
  return { tags: names.slice(0, max), more: Math.max(0, names.length - max) }
}

function handwerkerKurz(a: AngebotListeEintrag, max = 2) {
  const names = Array.from(
    new Set(
      (a.angebot_handwerker ?? [])
        .map((z) => z.handwerker?.name?.trim())
        .filter((n): n is string => Boolean(n))
    )
  )
  return { names: names.slice(0, max), more: Math.max(0, names.length - max) }
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'kunde', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'gesamt', label: 'Gesamt' },
  { key: 'handwerker', label: 'Handwerker' },
  { key: 'created_at', label: 'Erstellt am' },
]

type SortRow = {
  angebot: AngebotListeEintrag
  name: string
  created_at: string
  gesamt: number
  status: AngebotStatus
}

function toExportRow(a: AngebotListeEintrag): Record<string, unknown> {
  const { tags, more } = gewerkeTags(a, 20)
  const hw = handwerkerKurz(a, 20)
  return {
    kunde: kundenName(a),
    status: ANGEBOT_STATUS_LABELS[a.status] ?? a.status,
    gewerke: tags.join(', ') + (more ? ` +${more}` : ''),
    gesamt: formatPreis(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max),
    handwerker: hw.names.join(', ') + (hw.more ? ` +${hw.more}` : ''),
    created_at: a.created_at,
  }
}

export function AngeboteListeClient({ angebote }: { angebote: AngebotListeEintrag[] }) {
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [panelId, setPanelId] = useState<string | null>(null)
  const [panelSummary, setPanelSummary] = useState<AngebotListeEintrag | null>(null)

  const [statusFilter, setStatusFilter] = useState<AngebotFilterKey>('')
  const [statusAllowList, setStatusAllowList] = useState<AngebotStatus[] | null>(null)
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    const raw = searchParams.get('status')
    if (!raw?.trim()) {
      setStatusAllowList(null)
      return
    }
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean) as AngebotStatus[]
    setStatusAllowList(parts.length ? parts : null)
  }, [searchParams])

  const statusCounts = useMemo(() => {
    const c: Partial<Record<AngebotFilterKey, number>> = { '': angebote.length }
    for (const a of angebote) {
      for (const key of FILTER_ORDER) {
        if (!key) continue
        if (matchesStatusFilter(a, key)) {
          c[key] = (c[key] ?? 0) + 1
        }
      }
    }
    return c
  }, [angebote])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return angebote.filter((a) => {
      if (statusAllowList?.length) {
        if (!statusAllowList.includes(a.status)) return false
      } else if (!matchesStatusFilter(a, statusFilter)) return false
      if (dateRange && !datumInZeitraum(a.created_at, dateRange)) return false
      if (!needle) return true
      const name = kundenName(a).toLowerCase()
      const mail = (a.kunden?.email ?? '').toLowerCase()
      return name.includes(needle) || mail.includes(needle)
    })
  }, [angebote, statusFilter, statusAllowList, debouncedQ, dateRange])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((a) => ({
        angebot: a,
        name: kundenName(a),
        created_at: a.created_at,
        gesamt:
          a.gesamt_fix ??
          (a.gesamt_min != null && a.gesamt_max != null
            ? (a.gesamt_min + a.gesamt_max) / 2
            : a.gesamt_min ?? a.gesamt_max ?? 0),
        status: a.status,
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const hasFilters = !!(statusFilter || statusAllowList?.length || zeitraum !== 'alle' || q.trim())

  function resetAllFilters() {
    setStatusFilter('')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  function openPanel(a: AngebotListeEintrag) {
    setPanelId(a.id)
    setPanelSummary(a)
  }

  return (
    <div>
      <PageHeader
        title="Angebote"
        breadcrumbs={[{ label: 'Angebote' }]}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExportOpen(true)}>
              ⬇️ Export
            </button>
            <Link href="/angebote/neu" className="btn btn-primary btn-sm">
              + Neues Angebot
            </Link>
          </div>
        }
      />

      <div className="mb-3 hidden md:block">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_ORDER.map((key) => {
            const label = FILTER_LABELS[key]
            const count = key === '' ? angebote.length : statusCounts[key] ?? 0
            const active = statusFilter === key
            return (
              <button
                key={key || 'alle'}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'btn btn-sm shrink-0 rounded-full border px-3',
                  active
                    ? 'border-bw-primary bg-bw-green-bg text-bw-primary'
                    : 'btn-secondary border-bw-border'
                )}
              >
                {label}
                {key && count > 0 ? (
                  <span className="ml-1 rounded-full bg-bw-card px-1.5 text-[10px] text-bw-mid">{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-bw-border bg-bw-card p-3 shadow-card">
          <label className="text-xs font-medium text-bw-mid">
            Zeitraum
            <select
              className="input mt-1 min-h-[40px] min-w-[180px]"
              value={zeitraum}
              onChange={(e) => setZeitraum(e.target.value as ZeitraumPreset)}
            >
              {ZEITRAUM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {zeitraum === 'benutzerdefiniert' ? (
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-bw-mid">
                Von
                <input
                  type="date"
                  className="input mt-1"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="text-xs text-bw-mid">
                Bis
                <input
                  type="date"
                  className="input mt-1"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}
          <label className="min-w-[200px] flex-1 text-xs font-medium text-bw-mid">
            Suche
            <div className="mt-1 flex min-h-[40px] items-center gap-2 rounded-md border border-bw-border bg-bw-card px-2">
              <span aria-hidden>🔍</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Kunde, E-Mail"
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none"
              />
            </div>
          </label>
          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm mb-0.5 self-end" onClick={resetAllFilters}>
              × Filter zurücksetzen
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTER_ORDER.map((key) => {
            const label = FILTER_LABELS[key]
            const active = statusFilter === key
            return (
              <button
                key={`${key}-m`}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn('btn btn-sm shrink-0 rounded-full px-3', active ? 'btn-primary' : 'btn-secondary')}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input min-h-[40px] flex-1 text-sm"
            value={zeitraum}
            onChange={(e) => setZeitraum(e.target.value as ZeitraumPreset)}
            aria-label="Zeitraum"
          >
            {ZEITRAUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="flex min-h-[40px] min-w-0 flex-[2] items-center gap-1 rounded-md border border-bw-border bg-bw-card px-2">
            <span>🔍</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche…"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none"
            />
          </label>
        </div>
        {zeitraum === 'benutzerdefiniert' ? (
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              className="input flex-1"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <input
              type="date"
              className="input flex-1"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <MobileSortSelect
        options={[
          { field: 'name', label: 'Kunde' },
          { field: 'created_at', label: 'Datum' },
          { field: 'gesamt', label: 'Gesamt' },
          { field: 'status', label: 'Status' },
        ]}
        currentField={field}
        currentDir={dir}
        onSort={(f) => (f ? handleSort(f) : resetSort())}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={angebote.length === 0 ? 'Noch keine Angebote' : 'Keine Treffer'}
          description={
            angebote.length === 0
              ? 'Erstellen Sie ein neues Angebot, um es hier zu sehen.'
              : 'Passe Filter oder Suche an.'
          }
          action={
            angebote.length === 0 ? (
              <Link href="/angebote/neu" className="btn btn-primary btn-sm">
                + Neues Angebot
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {sorted.map(({ angebot: a }) => {
              const g = gewerkeTags(a)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => openPanel(a)}
                    className="card w-full p-4 text-left transition-colors hover:bg-bw-hover"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-bw-text">{kundenName(a)}</p>
                        <AngebotStatusBadge status={a.status} />
                        {g.tags.length ? (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {g.tags.map((t) => (
                              <span key={t} className="badge rounded bg-bw-bg px-1.5 py-0.5 text-[10px]">
                                {t}
                              </span>
                            ))}
                            {g.more > 0 ? (
                              <span className="text-[10px] text-bw-light">+{g.more}</span>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-sm text-bw-text">
                          {formatPreis(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                        </p>
                        <p className="text-xs text-bw-text-muted">{formatRelativeDate(a.created_at)}</p>
                      </div>
                      <span className="text-bw-light">→</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-bw-border bg-bw-card shadow-card md:block">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-bg">
                  <th className="px-3 py-3" style={{ width: '22%' }}>
                    <SortableHeader
                      label="Kunde"
                      field="name"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 120 }}>
                    <SortableHeader
                      label="Status"
                      field="status"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 200 }}>
                    Gewerke
                  </th>
                  <th className="px-3 py-3" style={{ width: 140 }}>
                    <SortableHeader
                      label="Gesamt"
                      field="gesamt"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 200 }}>
                    Handwerker
                  </th>
                  <th className="px-3 py-3" style={{ width: 120 }}>
                    <SortableHeader
                      label="Datum"
                      field="created_at"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ angebot: a }) => {
                  const g = gewerkeTags(a)
                  const hw = handwerkerKurz(a)
                  return (
                    <tr
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPanel(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openPanel(a)
                        }
                      }}
                      className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-bw-text">{kundenName(a)}</p>
                        {a.leads?.bereiche?.length ? (
                          <p className="mt-1 text-xs text-bw-text-muted">
                            {(a.leads.bereiche ?? []).map((b) => BEREICH_LABELS[b] ?? b).join(' · ')}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <AngebotStatusBadge status={a.status} />
                      </td>
                      <td className="max-w-[200px] px-3 py-3 text-bw-text-muted">
                        <div className="flex flex-wrap gap-1">
                          {g.tags.map((t) => (
                            <span key={t} className="badge rounded bg-bw-bg px-1.5 py-0.5 text-[10px]">
                              {t}
                            </span>
                          ))}
                          {g.more > 0 ? <span className="text-[10px]">+{g.more}</span> : null}
                          {!g.tags.length ? '—' : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-bw-text">
                        {formatPreis(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                      </td>
                      <td className="max-w-[200px] px-3 py-3 text-xs text-bw-text-muted">
                        {hw.names.length ? (
                          <>
                            {hw.names.join(', ')}
                            {hw.more > 0 ? ` +${hw.more}` : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-bw-text-muted">
                        {formatLeadListDatum(a.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AngebotSidePanel
        open={!!panelId}
        onClose={() => {
          setPanelId(null)
          setPanelSummary(null)
        }}
        angebotId={panelId}
        summary={panelSummary}
      />

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Angebote exportieren"
        fields={EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : angebote
          const data = source.map(toExportRow)
          const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'angebote')
        }}
      />
    </div>
  )
}
