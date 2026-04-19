'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SidePanel } from '@/components/ui/SidePanel'
import { Button } from '@/components/ui/Button'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'

export type HandwerkerZeile = {
  id: string
  name: string
  firma: string | null
  email: string | null
  telefon: string | null
  gewerke: unknown
  compliance_status: string | null
  created_at: string | null
}

const STATUS_FILTERS = [
  { value: '', label: 'Alle' },
  { value: 'vollständig', label: 'Vollständig' },
  { value: 'warnung', label: 'Warnung' },
  { value: 'unvollständig', label: 'Unvollständig' },
  { value: 'abgelaufen', label: 'Abgelaufen' },
] as const

const HANDWERKER_EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'firma', label: 'Firma' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'gewerke', label: 'Gewerke' },
  { key: 'compliance_status', label: 'Compliance' },
]

function gewerkeStr(h: HandwerkerZeile): string {
  const g = h.gewerke
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

export function HandwerkerListeClient({
  rows,
  einsatzFilterAktiv = false,
}: {
  rows: HandwerkerZeile[]
  einsatzFilterAktiv?: boolean
}) {
  const router = useRouter()
  const { exportToCSV } = useExport()
  const [panel, setPanel] = useState<HandwerkerZeile | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((h) => {
      if (status && (h.compliance_status ?? '') !== status) return false
      if (dateRange && !datumInZeitraum(h.created_at, dateRange)) return false
      if (!needle) return true
      const pool = [h.name, h.firma ?? '', h.email ?? '', h.telefon ?? '']
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [rows, status, q, dateRange])

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (status) {
      const label = STATUS_FILTERS.find((s) => s.value === status)?.label
      if (label) t.push({ id: 'status', label, onRemove: () => setStatus('') })
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
  }, [status, zeitraum, q])

  const hasActiveFilters = !!(status || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setStatus('')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  return (
    <div>
      {einsatzFilterAktiv ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bw-border bg-bw-bg px-4 py-2 text-sm text-bw-text">
          <span>
            Nur Handwercher mit Auftrag (Status zugewiesen oder in Arbeit).
          </span>
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

      <ListFilterBar
        statusLabel="Compliance"
        statusOptions={[...STATUS_FILTERS]}
        statusValue={status}
        onStatusChange={setStatus}
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
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={rows.length === 0 ? 'Keine Handwerker' : 'Keine Treffer'}
          description={
            rows.length === 0
              ? 'Lege Handwerker an, um sie hier zu verwalten.'
              : 'Passe Filter oder Suche an.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setPanel(h)}
                  className="w-full rounded-lg border border-bw-border bg-bw-card p-4 text-left shadow-card transition-colors hover:border-bw-primary/40"
                >
                  <p className="font-semibold text-ink">{h.name}</p>
                  {h.firma ? <p className="text-sm text-muted">{h.firma}</p> : null}
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-bw-border bg-bw-card shadow-card md:block">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-bg text-muted">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Firma</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
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
      >
        {panel ? (
          <div className="space-y-4 p-5 text-sm">
            {panel.telefon ? (
              <a href={`tel:${panel.telefon}`} className="block text-bw-link">
                {panel.telefon}
              </a>
            ) : null}
            {panel.email ? (
              <a href={`mailto:${panel.email}`} className="block text-bw-link">
                {panel.email}
              </a>
            ) : null}
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                router.push(`/handwerker/${panel.id}`)
                setPanel(null)
              }}
            >
              Vollständig öffnen
            </Button>
          </div>
        ) : null}
      </SidePanel>

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={HANDWERKER_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : rows
          const data = source.map(handwerkerExportRow)
          const fields = HANDWERKER_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'handwerker')
        }}
      />
    </div>
  )
}
