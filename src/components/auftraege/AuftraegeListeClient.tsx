'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Download, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SidePanel } from '@/components/ui/SidePanel'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { formatDatum, formatPreis, AUFTRAG_STATUS_LABELS, cn } from '@/lib/utils'
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
  const fromPos = Array.from(
    new Set((a.auftrag_positionen ?? []).map((p) => p.gewerk_name).filter(Boolean) as string[])
  )
  if (fromPos.length) return fromPos.slice(0, 5)
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

function listSubtitle(a: AuftragListeEintrag) {
  const titel = a.titel?.trim()
  if (titel) return titel
  const fromPos = Array.from(
    new Set((a.auftrag_positionen ?? []).map((p) => p.gewerk_name).filter(Boolean) as string[])
  )
  if (fromPos.length) return fromPos.slice(0, 3).join(' · ')
  return auftragTitel(a)
}

function listMeta(a: AuftragListeEintrag): string | undefined {
  const k = a.kunden
  const addr = [k?.adresse, k?.plz].filter(Boolean).join(', ').trim() || null
  const start = a.start_datum ? `Start: ${formatDatum(a.start_datum)}` : null
  const parts = [addr, start].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
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

  useEffect(() => {
    const sid = searchParams.get('selected')
    if (!sid?.trim()) return
    const found = auftraege.find((x) => x.id === sid.trim())
    if (found) setPanelAuftrag(found)
  }, [searchParams, auftraege])

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

  const statusChipOptions = useMemo(
    () =>
      STATUS_FILTERS.map((o) => ({
        label: o.label,
        value: o.value,
        count:
          o.value === ''
            ? auftraege.length
            : auftraege.filter((a) => a.status === o.value).length,
      })),
    [auftraege]
  )

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

      {!statusList?.length ? (
        <div className="sticky top-14 z-10 -mx-4 border-b border-bw-border bg-bw-bg px-4 py-3 md:-mx-6 md:px-6">
          <FilterChips
            options={statusChipOptions}
            selected={status === '' ? [''] : [status]}
            onChange={(v) => {
              const next = (v[0] ?? '') as '' | AuftragStatus
              setStatus(next)
            }}
          />
        </div>
      ) : null}

      <ListFilterBar
        statusOptions={STATUS_FILTERS}
        statusValue={status}
        onStatusChange={(v) => setStatus(v as '' | AuftragStatus)}
        hideStatusFilter={!statusList?.length}
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
        <div className="card overflow-hidden">
          <div>
            {filtered.map((a) => (
              <ListCard
                key={a.id}
                title={kundenName(a)}
                badge={<AuftragStatusBadge status={a.status} />}
                subtitle={listSubtitle(a)}
                tags={gewerkeTags(a)}
                meta={
                  [
                    listMeta(a),
                    a.angebote
                      ? formatPreis(
                          a.angebote.gesamt_fix ?? null,
                          a.angebote.gesamt_min ?? null,
                          a.angebote.gesamt_max ?? null
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
                onClick={() => setPanelAuftrag(a)}
              />
            ))}
          </div>
        </div>
      )}

      <SidePanel
        open={!!panelAuftrag}
        onClose={() => setPanelAuftrag(null)}
        title={panelAuftrag ? kundenName(panelAuftrag) : ''}
        subtitle={panelAuftrag?.start_datum ? `Start: ${formatDatum(panelAuftrag.start_datum)}` : undefined}
        badge={panelAuftrag ? <AuftragStatusBadge status={panelAuftrag.status} /> : null}
      >
        {panelAuftrag ? (
          <div className="space-y-4 p-5">
            <div>
              <ProgressBar
                value={panelAuftrag.fortschritt ?? 0}
                label={`Fortschritt: ${panelAuftrag.fortschritt ?? 0}%`}
              />
            </div>

            <div className="space-y-1 text-sm">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-bw-text-muted">Kunde</div>
              <div className="font-medium text-bw-text">{kundenName(panelAuftrag)}</div>
              {panelAuftrag.kunden?.telefon ? (
                <a
                  href={`tel:${panelAuftrag.kunden.telefon}`}
                  className="flex items-center gap-1.5 text-bw-link"
                >
                  📞 {panelAuftrag.kunden.telefon}
                </a>
              ) : null}
              {panelAuftrag.kunden &&
              (panelAuftrag.kunden.adresse || panelAuftrag.kunden.plz || panelAuftrag.kunden.ort) ? (
                <div className="text-xs text-bw-text-muted">
                  📍{' '}
                  {[panelAuftrag.kunden.adresse, panelAuftrag.kunden.plz, panelAuftrag.kunden.ort]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              ) : null}
            </div>

            {(panelAuftrag.auftrag_positionen?.length ?? 0) > 0 ? (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-bw-text-muted">Gewerke</div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    new Set((panelAuftrag.auftrag_positionen ?? []).map((p) => p.gewerk_name).filter(Boolean) as string[])
                  ).map((g, i) => (
                    <span key={`${g}-${i}`} className={cn('chip selected text-xs')}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              {panelAuftrag.start_datum ? (
                <div className="rounded-lg bg-bw-hover p-3">
                  <div className="mb-1 text-xs text-bw-text-muted">Start</div>
                  <div className="text-sm font-medium text-bw-text">
                    {new Date(panelAuftrag.start_datum).toLocaleDateString('de')}
                  </div>
                </div>
              ) : null}
              {panelAuftrag.end_datum ? (
                <div className="rounded-lg bg-bw-hover p-3">
                  <div className="mb-1 text-xs text-bw-text-muted">Geplant fertig</div>
                  <div className="text-sm font-medium text-bw-text">
                    {new Date(panelAuftrag.end_datum).toLocaleDateString('de')}
                  </div>
                </div>
              ) : null}
            </div>

            {panelAuftrag.angebote ? (
              <div className="rounded-lg bg-bw-green-bg p-3">
                <div className="mb-1 text-xs text-bw-primary">Auftragswert</div>
                <div className="text-lg font-semibold text-bw-dark">
                  {formatPreis(
                    panelAuftrag.angebote.gesamt_fix ?? null,
                    panelAuftrag.angebote.gesamt_min ?? null,
                    panelAuftrag.angebote.gesamt_max ?? null
                  )}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-bw-text-muted">{handwerkerNamen(panelAuftrag)}</p>

            <div className="border-t border-bw-border pt-2">
              <Link
                href={`/auftraege/${panelAuftrag.id}`}
                className="text-sm text-bw-link hover:underline"
                onClick={() => setPanelAuftrag(null)}
              >
                Zum Auftrag →
              </Link>
            </div>
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
