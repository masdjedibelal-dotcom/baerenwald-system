'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SidePanel } from '@/components/ui/SidePanel'
import { Button } from '@/components/ui/Button'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { formatDatum, formatPreis, AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import type { AuftragListeEintrag, AuftragStatus } from '@/lib/types'

const STATUS_FILTERS: { value: '' | AuftragStatus; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'offen', label: 'Offen' },
  { value: 'in_arbeit', label: 'In Arbeit' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'storniert', label: 'Storniert' },
]

const AUFTRAG_EXPORT_FIELDS: ExportField[] = [
  { key: 'titel', label: 'Titel' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'start_datum', label: 'Start' },
  { key: 'end_datum', label: 'Ende' },
  { key: 'handwerker', label: 'Handwerker' },
  { key: 'created_at', label: 'Erstellt am' },
]

function kundenName(a: AuftragListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

function gewerkeTags(a: AuftragListeEintrag) {
  const names = new Set<string>()
  for (const z of a.auftrag_handwerker ?? []) {
    if (z.gewerke?.name) names.add(z.gewerke.name)
  }
  return Array.from(names)
}

function handwerkerNamen(a: AuftragListeEintrag) {
  const names = (a.auftrag_handwerker ?? [])
    .map((z) => z.handwerker?.name)
    .filter(Boolean) as string[]
  return names.length ? names.join(', ') : '—'
}

function auftragTitel(a: AuftragListeEintrag) {
  return a.titel?.trim() || kundenName(a)
}

function auftragExportRow(a: AuftragListeEintrag): Record<string, unknown> {
  return {
    titel: auftragTitel(a),
    kunde: kundenName(a),
    status: AUFTRAG_STATUS_LABELS[a.status] ?? a.status,
    start_datum: a.start_datum ?? '',
    end_datum: a.end_datum ?? '',
    handwerker: handwerkerNamen(a),
    created_at: a.created_at,
  }
}

export function AuftraegeListeClient({ auftraege }: { auftraege: AuftragListeEintrag[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [panelAuftrag, setPanelAuftrag] = useState<AuftragListeEintrag | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [status, setStatus] = useState<'' | AuftragStatus>('')
  const [statusList, setStatusList] = useState<AuftragStatus[] | null>(null)
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    const raw = searchParams.get('status')
    if (!raw?.trim()) {
      setStatusList(null)
      return
    }
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean) as AuftragStatus[]
    setStatusList(parts.length ? parts : null)
  }, [searchParams])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return auftraege.filter((a) => {
      if (statusList?.length) {
        if (!statusList.includes(a.status)) return false
      } else if (status && a.status !== status) return false
      if (dateRange && !datumInZeitraum(a.created_at, dateRange)) return false
      if (!needle) return true
      const kunde = kundenName(a).toLowerCase()
      const titel = (a.titel ?? '').toLowerCase()
      const hw = handwerkerNamen(a).toLowerCase()
      return kunde.includes(needle) || titel.includes(needle) || hw.includes(needle)
    })
  }, [auftraege, status, statusList, q, dateRange])

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

  const hasActiveFilters = !!(status || statusList?.length || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setStatus('')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  return (
    <div>
      <PageHeader
        title="Aufträge"
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
        statusOptions={STATUS_FILTERS}
        statusValue={status}
        onStatusChange={(v) => setStatus(v as '' | AuftragStatus)}
        zeitraumValue={zeitraum}
        onZeitraumChange={setZeitraum}
        showCustomDates={zeitraum === 'benutzerdefiniert'}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Kunde, Titel, Handwerker"
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        tags={filterTags}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={auftraege.length === 0 ? 'Keine Aufträge' : 'Keine Treffer'}
          description={
            auftraege.length === 0
              ? 'Aufträge aus angenommenen Angeboten erscheinen hier.'
              : 'Filter anpassen.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setPanelAuftrag(a)}
                  className="block w-full rounded-lg border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold text-ink">{kundenName(a)}</p>
                      {gewerkeTags(a).length ? (
                        <div className="flex flex-wrap gap-1">
                          {gewerkeTags(a).map((g) => (
                            <span
                              key={g}
                              className="rounded-md bg-canvas px-2 py-0.5 text-xs text-muted"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {a.start_datum ? (
                        <p className="text-xs text-muted">Start: {formatDatum(a.start_datum)}</p>
                      ) : null}
                      <p className="text-sm text-muted">{handwerkerNamen(a)}</p>
                      {a.angebote ? (
                        <p className="text-sm text-muted">
                          Angebot:{' '}
                          {formatPreis(a.angebote.gesamt_min ?? null, a.angebote.gesamt_max ?? null)}
                        </p>
                      ) : null}
                    </div>
                    <AuftragStatusBadge status={a.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border bg-surface shadow-card md:block">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-muted">
                  <th className="px-3 py-3 font-medium">Kunde</th>
                  <th className="px-3 py-3 font-medium">Angebot</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Gewerke</th>
                  <th className="px-3 py-3 font-medium">Handwerker</th>
                  <th className="px-3 py-3 font-medium">Start</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => setPanelAuftrag(a)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPanelAuftrag(a)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <td className="px-3 py-3 font-medium text-ink">{kundenName(a)}</td>
                    <td className="px-3 py-3 text-muted">
                      {a.angebote
                        ? formatPreis(a.angebote.gesamt_min ?? null, a.angebote.gesamt_max ?? null)
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <AuftragStatusBadge status={a.status} />
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-muted">
                      {gewerkeTags(a).length ? gewerkeTags(a).join(', ') : '—'}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-muted">{handwerkerNamen(a)}</td>
                    <td className="px-3 py-3 text-muted">
                      {a.start_datum ? formatDatum(a.start_datum) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/auftraege/${a.id}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-medium text-primary hover:underline"
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
        open={!!panelAuftrag}
        onClose={() => setPanelAuftrag(null)}
        title={panelAuftrag ? kundenName(panelAuftrag) : ''}
        subtitle={panelAuftrag?.start_datum ? `Start: ${formatDatum(panelAuftrag.start_datum)}` : undefined}
        badge={panelAuftrag ? <AuftragStatusBadge status={panelAuftrag.status} /> : null}
      >
        {panelAuftrag ? (
          <div className="space-y-4 p-5 text-sm">
            <p className="text-bw-text-muted">{handwerkerNamen(panelAuftrag)}</p>
            {panelAuftrag.angebote ? (
              <p>
                Angebot:{' '}
                {formatPreis(
                  panelAuftrag.angebote.gesamt_min ?? null,
                  panelAuftrag.angebote.gesamt_max ?? null
                )}
              </p>
            ) : null}
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                router.push(`/auftraege/${panelAuftrag.id}`)
                setPanelAuftrag(null)
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
        fields={AUFTRAG_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : auftraege
          const data = source.map(auftragExportRow)
          const fields = AUFTRAG_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'auftraege')
        }}
      />
    </div>
  )
}
