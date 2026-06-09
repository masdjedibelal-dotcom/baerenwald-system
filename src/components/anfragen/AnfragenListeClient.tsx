'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Inbox, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ListFilterSection,
  ListGridShell,
  ListMobileStack,
} from '@/components/layout/ListPageParts'
import { EntityListShell, AppEntityListRow } from '@/components/layout/app'
import { EmptyState } from '@/components/layout/EmptyState'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { isGptProjektStudio } from '@/lib/gpt-viz/funnel-daten'
import { leadInAnfragenPipeline } from '@/lib/crm/pipeline-liste-filter'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import {
  BEREICH_LABELS,
  KANAL_LABELS,
  STATUS_LABELS,
  anfragenPreisSpaltenLabel,
  cn,
  formatAnfragePreisAnzeige,
  formatDatumZeit,
} from '@/lib/utils'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { LeadKanal, LeadStatus, LeadWithAngebote } from '@/lib/types'
const ANFRAGEN_GRID_COLS =
  '42px minmax(160px,1.6fr) minmax(120px,1.1fr) minmax(130px,1.2fr) minmax(128px,0.95fr) minmax(72px,0.75fr) 100px 100px'

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
  'termin',
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
  { key: 'preis_anzeige', label: 'Preis / Budget (Anzeige)' },
  { key: 'budget_ca', label: 'budget_ca' },
  { key: 'preis_min', label: 'preis_min' },
  { key: 'preis_max', label: 'preis_max' },
  { key: 'plz', label: 'PLZ' },
  { key: 'created_at', label: 'Erstellt am' },
]

function leadName(lead: LeadWithAngebote) {
  return leadKontaktAnzeigeName(lead)
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

function leadProjektBereicheChips(lead: LeadWithAngebote) {
  return bereicheFuerAnzeige(lead.bereiche, lead.situation)
}

function leadRegion(lead: LeadWithAngebote) {
  const plz = lead.plz?.trim()
  const k = lead.kunden
  const ort =
    k && typeof k === 'object' && 'ort' in k && typeof (k as { ort?: string }).ort === 'string'
      ? (k as { ort: string }).ort.trim()
      : ''
  if (plz && ort) return `${plz} ${ort}`
  return plz || ort || '—'
}

function leadSituationText(lead: LeadWithAngebote) {
  return leadSituationDisplay(lead.situation) || '—'
}

function leadBereicheText(lead: LeadWithAngebote) {
  const bereiche = leadProjektBereicheChips(lead)
  if (!bereiche.length) return '—'
  return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
}

function leadEingegangen(lead: LeadWithAngebote) {
  return lead.created_at ? formatDatumZeit(lead.created_at) : '—'
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
    preis_anzeige: formatAnfragePreisAnzeige(
      lead.kanal,
      lead.budget_ca,
      lead.preis_min,
      lead.preis_max,
      lead.funnel_daten
    ),
    budget_ca: lead.budget_ca ?? '',
    preis_min: lead.preis_min ?? '',
    preis_max: lead.preis_max ?? '',
    plz: lead.plz ?? '',
    created_at: lead.created_at,
  }
}

export function AnfragenListeClient({
  leads,
  mode = 'page',
  selectedId = null,
}: {
  leads: LeadWithAngebote[]
  /** `pane` = schmale Master-Spalte ab 900px */
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [neuOpen, setNeuOpen] = useState(false)
  const defaultKundeId = searchParams.get('kunde_id')

  function closeNeuSheet() {
    setNeuOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('neu')
    const q = params.toString()
    router.replace(q ? `/anfragen?${q}` : '/anfragen', { scroll: false })
  }

  function openNeuSheet() {
    setNeuOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('neu', '1')
    router.replace(`/anfragen?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setNeuOpen(true)
  }, [searchParams])

  const [statusFilter, setStatusFilter] = useState<'' | LeadStatus>('')
  const [pipelineOnly, setPipelineOnly] = useState(true)
  const [kiProjektOnly, setKiProjektOnly] = useState(false)
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
    if (z === 'diese_woche') setZeitraum('diese_woche')
    if (z === 'dieser_monat') setZeitraum('dieser_monat')
  }, [searchParams])

  const pipelineLeads = useMemo(() => leads.filter(leadInAnfragenPipeline), [leads])
  const baseLeads = pipelineOnly ? pipelineLeads : leads

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { '': baseLeads.length }
    for (const l of baseLeads) {
      c[l.status] = (c[l.status] ?? 0) + 1
    }
    return c
  }, [baseLeads])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const kiProjektCount = useMemo(
    () => baseLeads.filter((l) => isGptProjektStudio(l.funnel_daten)).length,
    [baseLeads]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return baseLeads.filter((l) => {
      if (kiProjektOnly && !isGptProjektStudio(l.funnel_daten)) return false
      if (statusFilter && l.status !== statusFilter) return false
      if (kanal && l.kanal !== kanal) return false
      if (dateRange && !datumInZeitraum(l.created_at, dateRange)) return false
      if (!needle) return true
      const name = leadName(l).toLowerCase()
      const mail = leadEmail(l).toLowerCase()
      const tel = leadTel(l).replace(/\s/g, '').toLowerCase()
      return name.includes(needle) || mail.includes(needle) || tel.includes(needle)
    })
  }, [baseLeads, statusFilter, kanal, debouncedQ, dateRange, kiProjektOnly])

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

  const hasFilters = !!(statusFilter || kanal || zeitraum !== 'alle' || q.trim() || !pipelineOnly || kiProjektOnly)

  function resetAllFilters() {
    setStatusFilter('')
    setPipelineOnly(true)
    setKiProjektOnly(false)
    setKanal('')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    // Status steht bereits in FilterChips — kein Tag doppelt anzeigen
    if (kanal) {
      t.push({ id: 'kanal', label: KANAL_LABELS[kanal], onRemove: () => setKanal('') })
    }
    if (zeitraum !== 'alle') {
      t.push({
        id: 'zeitraum',
        label: zeitraumLabel(zeitraum),
        onRemove: () => {
          setZeitraum('alle')
          setCustomFrom('')
          setCustomTo('')
        },
      })
    }
    if (q.trim()) {
      t.push({ id: 'q', label: `„${q.trim()}“`, onRemove: () => setQ('') })
    }
    if (kiProjektOnly) {
      t.push({ id: 'ki', label: 'KI-Projekt', onRemove: () => setKiProjektOnly(false) })
    }
    return t
  }, [statusFilter, kanal, zeitraum, q, kiProjektOnly])

  function openDetail(leadId: string) {
    router.push(`/anfragen/${leadId}`)
  }

  const isPane = mode === 'pane'

  return (
    <EntityListShell
      mode={mode}
      filters={
        <ListFilterSection
          chipGroups={[
            {
              label: 'Ansicht',
              options: [
                { label: 'Pipeline', value: 'pipeline', count: pipelineLeads.length },
                { label: 'Alle', value: 'all', count: leads.length },
              ],
              selected: [pipelineOnly ? 'pipeline' : 'all'],
              onChange: (v) => setPipelineOnly((v[0] ?? 'pipeline') === 'pipeline'),
            },
            {
              label: 'Status',
              options: STATUS_ORDER.map((st) => ({
                label: st === '' ? 'Alle' : STATUS_LABELS[st],
                value: st,
                count: st === '' ? baseLeads.length : statusCounts[st] ?? 0,
              })),
              selected: [statusFilter],
              onChange: (v) => setStatusFilter((v[0] ?? '') as '' | LeadStatus),
            },
            {
              label: 'Typ',
              options: [
                { label: 'Alle', value: 'all', count: baseLeads.length },
                { label: 'KI-Projekt', value: 'ki', count: kiProjektCount },
              ],
              selected: [kiProjektOnly ? 'ki' : 'all'],
              onChange: (v) => setKiProjektOnly((v[0] ?? 'all') === 'ki'),
            },
          ]}
        >
          <ListFilterBar
            hideStatusFilter
            statusLabel="Status"
            statusOptions={[{ value: '', label: '—' }]}
            statusValue=""
            onStatusChange={() => {}}
            secondaryFilter={{
              label: 'Kanal',
              options: KANAL_FILTERS.map((o) => ({ value: o.value, label: o.label })),
              value: kanal,
              onChange: (v) => setKanal(v as '' | LeadKanal),
            }}
            zeitraumValue={zeitraum}
            onZeitraumChange={setZeitraum}
            showCustomDates={zeitraum === 'benutzerdefiniert'}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Suchen…"
            onReset={resetAllFilters}
            hasActiveFilters={hasFilters}
            tags={filterTags}
            onExportClick={() => setExportOpen(true)}
            resultCount={filtered.length}
            sort={{
              options: [
                { field: 'name', label: 'Name' },
                { field: 'created_at', label: 'Datum' },
                { field: 'preis_min', label: anfragenPreisSpaltenLabel() },
                { field: 'status', label: 'Status' },
              ],
              currentField: field,
              currentDir: dir,
              onSort: (f) => (f ? handleSort(f) : resetSort()),
            }}
          />
        </ListFilterSection>
      }
    >
      <PageHeader className={cn(isPane ? 'hidden' : 'hidden md:block')} />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            leads.length === 0
              ? 'Noch keine Anfragen'
              : pipelineOnly && pipelineLeads.length === 0
                ? 'Keine Anfragen in der Pipeline'
                : 'Keine Treffer'
          }
          description={
            leads.length === 0
              ? 'Anfragen kommen automatisch über die Website oder du legst sie manuell an.'
              : pipelineOnly && pipelineLeads.length === 0
                ? 'Sobald ein Angebot erstellt wird, erscheint der Vorgang unter Angebote.'
                : 'Passe Filter oder Suche an.'
          }
          action={
            leads.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setNeuOpen(true)}>
                + Erste Anfrage anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {sorted.map(({ lead }) => (
              <AppEntityListRow
                key={lead.id}
                href={isPane ? `/anfragen/${lead.id}` : undefined}
                onClick={isPane ? undefined : () => openDetail(lead.id)}
                className={cn(selectedId === lead.id && 'ring-2 ring-bw-primary/40')}
                avatar={<ListAvatar name={leadName(lead)} />}
                title={leadName(lead)}
                line2={`${leadSituationText(lead)} · ${leadBereicheText(lead)}`}
                line3={leadEingegangen(lead)}
                line4={formatAnfragePreisAnzeige(
                  lead.kanal,
                  lead.budget_ca,
                  lead.preis_min,
                  lead.preis_max,
                  lead.funnel_daten
                )}
                badge={
                  <span className="flex flex-wrap items-center gap-1">
                    {isGptProjektStudio(lead.funnel_daten) ? (
                      <span className="inline-flex items-center gap-0.5 rounded-md border border-[#2E7D52]/30 bg-[#EAF3DE] px-1.5 py-0.5 text-[10px] font-semibold text-[#1A3D2B]">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        KI
                      </span>
                    ) : null}
                    <LeadStatusBadge status={lead.status} />
                  </span>
                }
              />
            ))}
          </ListMobileStack>

          <ListGridShell minWidth="1020px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div className="list-row-grid head" style={{ gridTemplateColumns: ANFRAGEN_GRID_COLS }}>
              <div />
              <SortableHeader label="Name" field="name" currentField={field} currentDir={dir} onSort={handleSort} />
              <div>Situation</div>
              <div>Bereiche</div>
              <SortableHeader
                label="Eingegangen"
                field="created_at"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <div>Region</div>
              <div className="text-right">
                <SortableHeader
                  label={anfragenPreisSpaltenLabel()}
                  field="preis_min"
                  currentField={field}
                  currentDir={dir}
                  onSort={handleSort}
                />
              </div>
              <SortableHeader label="Status" field="status" currentField={field} currentDir={dir} onSort={handleSort} />
            </div>
            {sorted.map(({ lead }) => (
              <div
                key={lead.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(lead.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(lead.id)
                  }
                }}
                className="list-row-grid"
                style={{ gridTemplateColumns: ANFRAGEN_GRID_COLS }}
              >
                <ListAvatar name={leadName(lead)} />
                <p className="truncate text-[13.5px] font-medium text-bw-text">
                  {isGptProjektStudio(lead.funnel_daten) ? (
                    <Sparkles className="mr-1 inline h-3 w-3 text-[#2E7D52]" aria-hidden />
                  ) : null}
                  {leadName(lead)}
                </p>
                <p className="truncate text-[13px] text-bw-text">{leadSituationText(lead)}</p>
                <p className="truncate text-[13px] text-bw-text-muted">{leadBereicheText(lead)}</p>
                <p className="truncate text-[13px] tabular-nums text-bw-text-muted">{leadEingegangen(lead)}</p>
                <p className="truncate text-[13px] text-bw-text-muted">{leadRegion(lead)}</p>
                <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                  {formatAnfragePreisAnzeige(
                    lead.kanal,
                    lead.budget_ca,
                    lead.preis_min,
                    lead.preis_max,
                    lead.funnel_daten
                  )}
                </p>
                <LeadStatusBadge status={lead.status} />
              </div>
            ))}
          </ListGridShell>
        </>
      )}

      <AnfrageNeuSheet
        open={neuOpen}
        onClose={closeNeuSheet}
        defaultKundeId={defaultKundeId}
        onSuccess={(id) => {
          closeNeuSheet()
          router.push(`/anfragen/${id}`)
          router.refresh()
        }}
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
    </EntityListShell>
  )
}
