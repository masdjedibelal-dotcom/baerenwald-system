'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { AnfrageSidePanel } from '@/components/anfragen/AnfrageSidePanel'
import {
  ANGEBOT_STATUS_LABELS,
  BEREICH_LABELS,
  KANAL_ICONS,
  KANAL_LABELS,
  STATUS_LABELS,
  formatBudget,
  formatLeadListDatum,
  formatPreis,
  formatRelativeDate,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  ZEITRAUM_OPTIONS,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import type { LeadKanal, LeadStatus, LeadWithAngebote } from '@/lib/types'

const KANAL_FILTERS: { value: '' | LeadKanal; label: string }[] = [
  { value: '', label: 'Alle Kanäle' },
  { value: 'website', label: 'Website' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-Mail' },
  { value: 'vor_ort', label: 'Vor Ort' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const STATUS_ORDER: ('' | LeadStatus)[] = [
  '',
  'neu',
  'kontaktiert',
  'angebot',
  'auftrag',
  'abgeschlossen',
  'abgebrochen',
]

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'status', label: 'Status' },
  { key: 'kanal', label: 'Kanal' },
  { key: 'bereiche', label: 'Bereiche' },
  { key: 'preis_min', label: 'Budget Min' },
  { key: 'preis_max', label: 'Budget Max' },
  { key: 'plz', label: 'PLZ' },
  { key: 'created_at', label: 'Erstellt am' },
]

function leadName(lead: LeadWithAngebote) {
  const k = lead.kunden
  if (k && 'name' in k && k.name) return k.name
  return lead.kontakt_name ?? 'Ohne Namen'
}

function leadEmail(lead: LeadWithAngebote) {
  const k = lead.kunden
  if (k && 'email' in k && k.email) return k.email
  return lead.kontakt_email ?? ''
}

function leadTel(lead: LeadWithAngebote) {
  const k = lead.kunden
  if (k && 'telefon' in k && k.telefon) return k.telefon
  return lead.kontakt_telefon ?? ''
}

function primaryAngebot(lead: LeadWithAngebote) {
  const a = lead.angebote
  if (!Array.isArray(a) || !a.length) return null
  return [...a].sort(
    (x, y) => new Date(y.created_at ?? 0).getTime() - new Date(x.created_at ?? 0).getTime()
  )[0]
}

function bereicheShort(bereiche: string[] | null, max = 2) {
  if (!bereiche?.length) return { tags: [] as string[], more: 0 }
  const labels = bereiche.map((b) => BEREICH_LABELS[b] ?? b)
  return { tags: labels.slice(0, max), more: Math.max(0, labels.length - max) }
}

type SortRow = {
  lead: LeadWithAngebote
  name: string
  created_at: string
  preis_min: number | null
  status: LeadStatus
}

function toExportRow(lead: LeadWithAngebote): Record<string, unknown> {
  return {
    name: leadName(lead),
    email: leadEmail(lead),
    telefon: leadTel(lead),
    status: STATUS_LABELS[lead.status] ?? lead.status,
    kanal: KANAL_LABELS[lead.kanal] ?? lead.kanal,
    bereiche: (lead.bereiche ?? []).map((b) => BEREICH_LABELS[b] ?? b).join(', '),
    preis_min: lead.preis_min,
    preis_max: lead.preis_max,
    plz: lead.plz ?? '',
    created_at: lead.created_at,
  }
}

export function AnfragenListeClient({ leads }: { leads: LeadWithAngebote[] }) {
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [panelId, setPanelId] = useState<string | null>(null)
  const [panelSummary, setPanelSummary] = useState<LeadWithAngebote | null>(null)

  const [statusFilter, setStatusFilter] = useState<'' | LeadStatus>('')
  const [kanal, setKanal] = useState<'' | LeadKanal>('')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    const st = searchParams.get('status') as LeadStatus | null
    const z = searchParams.get('zeitraum')
    if (st && STATUS_ORDER.includes(st)) setStatusFilter(st)
    if (z === 'heute') setZeitraum('heute')
  }, [searchParams])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { '': leads.length }
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1
    }
    return c
  }, [leads])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (kanal && l.kanal !== kanal) return false
      if (dateRange && !datumInZeitraum(l.created_at, dateRange)) return false
      if (!needle) return true
      const name = leadName(l).toLowerCase()
      const mail = leadEmail(l).toLowerCase()
      const tel = leadTel(l).replace(/\s/g, '').toLowerCase()
      return name.includes(needle) || mail.includes(needle) || tel.includes(needle)
    })
  }, [leads, statusFilter, kanal, debouncedQ, dateRange])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((lead) => ({
        lead,
        name: leadName(lead),
        created_at: lead.created_at,
        preis_min: lead.preis_min,
        status: lead.status,
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const hasFilters = !!(statusFilter || kanal || zeitraum !== 'alle' || q.trim())

  function resetAllFilters() {
    setStatusFilter('')
    setKanal('')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  function openPanel(lead: LeadWithAngebote) {
    setPanelId(lead.id)
    setPanelSummary(lead)
  }

  return (
    <div>
      <PageHeader
        title="Anfragen"
        breadcrumbs={[{ label: 'Anfragen' }]}
        action={
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExportOpen(true)}>
              ⬇️ Export
            </button>
            <Link href="/anfragen/neu" className="btn btn-primary btn-sm">
              + Neue Anfrage
            </Link>
          </div>
        }
      />

      {/* Status-Chips Desktop */}
      <div className="mb-3 hidden md:block">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_ORDER.map((st) => {
            const label = st === '' ? 'Alle' : STATUS_LABELS[st]
            const count = st === '' ? leads.length : statusCounts[st] ?? 0
            const active = statusFilter === st
            return (
              <button
                key={st || 'alle'}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'btn btn-sm shrink-0 rounded-full border px-3',
                  active
                    ? 'border-bw-primary bg-bw-green-bg text-bw-primary'
                    : 'btn-secondary border-bw-border'
                )}
              >
                {label}
                {st && count > 0 ? (
                  <span className="ml-1 rounded-full bg-bw-card px-1.5 text-[10px] text-bw-mid">{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-bw-border bg-bw-card p-3 shadow-card">
          <label className="text-xs font-medium text-bw-mid">
            Kanal
            <select
              className="input mt-1 min-h-[40px] min-w-[160px]"
              value={kanal}
              onChange={(e) => setKanal(e.target.value as '' | LeadKanal)}
            >
              {KANAL_FILTERS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
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
                placeholder="Name, E-Mail, Telefon"
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

      {/* Mobil: Chips + Filterzeile */}
      <div className="mb-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_ORDER.map((st) => {
            const label = st === '' ? 'Alle' : STATUS_LABELS[st]
            const active = statusFilter === st
            return (
              <button
                key={st || 'alle-m'}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'btn btn-sm shrink-0 rounded-full px-3',
                  active ? 'btn-primary' : 'btn-secondary'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input min-h-[40px] flex-1 text-sm"
            value={kanal}
            onChange={(e) => setKanal(e.target.value as '' | LeadKanal)}
            aria-label="Kanal"
          >
            {KANAL_FILTERS.map((o) => (
              <option key={o.value || 'all-m'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
        {hasFilters ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {statusFilter ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-bw-border bg-bw-bg px-2 py-1 text-xs"
                onClick={() => setStatusFilter('')}
              >
                {STATUS_LABELS[statusFilter]} ×
              </button>
            ) : null}
            {kanal ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-bw-border bg-bw-bg px-2 py-1 text-xs"
                onClick={() => setKanal('')}
              >
                {KANAL_LABELS[kanal]} ×
              </button>
            ) : null}
            {zeitraum !== 'alle' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-bw-border bg-bw-bg px-2 py-1 text-xs"
                onClick={() => {
                  setZeitraum('alle')
                  setCustomFrom('')
                  setCustomTo('')
                }}
              >
                {zeitraumLabel(zeitraum)} ×
              </button>
            ) : null}
            {q.trim() ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-bw-border bg-bw-bg px-2 py-1 text-xs"
                onClick={() => setQ('')}
              >
                „{q.trim()}“ ×
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <MobileSortSelect
        options={[
          { field: 'name', label: 'Name' },
          { field: 'created_at', label: 'Datum' },
          { field: 'preis_min', label: 'Budget' },
          { field: 'status', label: 'Status' },
        ]}
        currentField={field}
        currentDir={dir}
        onSort={(f) => (f ? handleSort(f) : resetSort())}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={leads.length === 0 ? 'Noch keine Anfragen' : 'Keine Treffer'}
          description={
            leads.length === 0
              ? 'Anfragen kommen automatisch über die Website oder du legst sie manuell an.'
              : 'Passe Filter oder Suche an.'
          }
          action={
            leads.length === 0 ? (
              <Link href="/anfragen/neu" className="btn btn-primary btn-sm">
                + Erste Anfrage anlegen
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {sorted.map(({ lead }) => {
              const { tags, more } = bereicheShort(lead.bereiche)
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => openPanel(lead)}
                    className="card w-full p-4 text-left transition-colors hover:bg-bw-hover"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="text-lg" aria-hidden>
                          {KANAL_ICONS[lead.kanal] ?? '•'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-bw-text">{leadName(lead)}</p>
                          <p className="text-xs text-bw-text-muted">
                            {tags.join(' · ')}
                            {more > 0 ? ` +${more}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-bw-text">{formatBudget(lead.preis_min, lead.preis_max)}</p>
                          <p className="mt-1 text-xs text-bw-text-muted">
                            {lead.plz ?? '—'} · {formatRelativeDate(lead.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <LeadStatusBadge status={lead.status} />
                        <span className="text-bw-light">→</span>
                      </div>
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
                  <th className="px-3 py-3" style={{ width: '28%' }}>
                    <SortableHeader
                      label="Name"
                      field="name"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 160 }}>
                    Bereiche
                  </th>
                  <th className="px-3 py-3" style={{ width: 140 }}>
                    <SortableHeader
                      label="Budget"
                      field="preis_min"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 140 }}>
                    <SortableHeader
                      label="Status"
                      field="status"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
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
                  <th className="px-3 py-3" style={{ width: 120 }}>
                    Angebot
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ lead }) => {
                  const ang = primaryAngebot(lead)
                  const { tags, more } = bereicheShort(lead.bereiche)
                  return (
                    <tr
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPanel(lead)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openPanel(lead)
                        }
                      }}
                      className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none" aria-hidden>
                            {KANAL_ICONS[lead.kanal] ?? '•'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-bw-text">{leadName(lead)}</p>
                            <p className="text-xs text-bw-text-muted">
                              {leadEmail(lead) || '—'} · {leadTel(lead) || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[160px] px-3 py-3 text-bw-text-muted">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <span key={t} className="badge rounded bg-bw-bg px-1.5 py-0.5 text-[10px]">
                              {t}
                            </span>
                          ))}
                          {more > 0 ? (
                            <span className="text-[10px] text-bw-light">+{more}</span>
                          ) : null}
                          {!tags.length ? '—' : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-bw-text">
                        {formatBudget(lead.preis_min, lead.preis_max)}
                      </td>
                      <td className="px-3 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-bw-text-muted">
                        {formatLeadListDatum(lead.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        {ang ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            {formatPreis(ang.gesamt_min, ang.gesamt_max)}
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full bg-bw-primary"
                              title={ANGEBOT_STATUS_LABELS[ang.status as keyof typeof ANGEBOT_STATUS_LABELS] ?? ang.status}
                              aria-hidden
                            />
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AnfrageSidePanel
        open={!!panelId}
        onClose={() => {
          setPanelId(null)
          setPanelSummary(null)
        }}
        leadId={panelId}
        summary={panelSummary}
      />

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Anfragen exportieren"
        fields={EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : leads
          const data = source.map(toExportRow)
          const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'anfragen')
        }}
      />
    </div>
  )
}
