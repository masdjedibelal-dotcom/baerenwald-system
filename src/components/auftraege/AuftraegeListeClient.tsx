'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import {
  ListFilterSection,
  ListGridShell,
  ListMobileStack,
} from '@/components/layout/ListPageParts'
import { EntityListShell, AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  auftragFortschritt,
  auftragKundenName,
  auftragOrt,
  auftragSuchtext,
  auftragTitel,
  auftragWertAnzeige,
  auftragWertNum,
  formatAuftragsNr,
  lieferdatumAnzeige,
  type AuftragListenPhase,
} from '@/lib/auftraege/auftrag-liste-helpers'
import {
  abrechnungPipelineLabel,
  countAuftragPipelinePhase,
  leereAuftragPipelineKontext,
  matchesAuftragPipelinePhase,
  type AuftragPipelineKontext,
} from '@/lib/crm/projekt-pipeline'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { AUFTRAG_STATUS_LABELS, cn, formatDatum } from '@/lib/utils'
import { gruppierenNachKunde } from '@/lib/crm/liste-gruppierung'
import type { AuftragListeEintrag, AuftragStatus } from '@/lib/types'

const PHASE_FILTERS: { value: AuftragListenPhase; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'fertig', label: 'Fertig' },
]

/** Auftrag | Kunde | Wert | Lieferdatum | Status */
const AUFTRAGE_GRID_COLS =
  'minmax(180px,1.65fr) minmax(110px,1fr) minmax(88px,0.7fr) minmax(100px,0.8fr) minmax(108px,0.75fr)'

const AUFTRAG_EXPORT_FIELDS: ExportField[] = [
  { key: 'nr', label: 'Nr.' },
  { key: 'auftrag', label: 'Auftrag' },
  { key: 'ort', label: 'Ort' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'wert', label: 'Wert' },
  { key: 'fortschritt', label: 'Fortschritt %' },
  { key: 'lieferdatum', label: 'Lieferdatum' },
  { key: 'start_datum', label: 'Start' },
]

type SortRow = {
  auftrag: AuftragListeEintrag
  auftrag_titel: string
  kunde: string
  wert: number
  end_datum: string
  status: AuftragStatus
}

function lieferdatumSortKey(a: AuftragListeEintrag): string {
  return a.end_datum || a.abnahme_datum || ''
}

function auftragExportRow(a: AuftragListeEintrag): Record<string, unknown> {
  return {
    nr: formatAuftragsNr(a),
    auftrag: auftragTitel(a),
    ort: auftragOrt(a),
    kunde: auftragKundenName(a),
    status: AUFTRAG_STATUS_LABELS[a.status] ?? a.status,
    wert: auftragWertAnzeige(a),
    fortschritt: auftragFortschritt(a),
    lieferdatum: lieferdatumAnzeige(a),
    start_datum: a.start_datum ? formatDatum(a.start_datum) : '',
  }
}

export function AuftraegeListeClient({
  auftraege,
  pipelineKontextByAuftragId = {},
  mode = 'page',
  selectedId = null,
}: {
  auftraege: AuftragListeEintrag[]
  pipelineKontextByAuftragId?: Record<string, AuftragPipelineKontext>
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [phase, setPhase] = useState<AuftragListenPhase>('aktiv')
  const [statusList, setStatusList] = useState<AuftragStatus[] | null>(null)
  const [q, setQ] = useState('')
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [darstellung, setDarstellung] = useState<'liste' | 'kunde'>('liste')
  const debouncedQ = useDebouncedValue(q, 300)

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
    if (sid?.trim()) router.replace(`/auftraege/${sid.trim()}`)
  }, [searchParams, router])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return auftraege.filter((a) => {
      if (statusList?.length) {
        if (!statusList.includes(a.status)) return false
      } else if (
        !matchesAuftragPipelinePhase(
          a,
          pipelineKontextByAuftragId[a.id] ?? leereAuftragPipelineKontext(),
          phase
        )
      ) {
        return false
      }
      if (dateRange && !datumInZeitraum(a.created_at, dateRange)) return false
      if (!needle) return true
      return auftragSuchtext(a).includes(needle)
    })
  }, [auftraege, phase, statusList, debouncedQ, dateRange, pipelineKontextByAuftragId])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((a) => ({
        auftrag: a,
        auftrag_titel: auftragTitel(a),
        kunde: auftragKundenName(a),
        wert: auftragWertNum(a),
        end_datum: lieferdatumSortKey(a),
        status: a.status,
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const kundenGruppen = useMemo(
    () =>
      gruppierenNachKunde(
        sorted.map((r) => r.auftrag),
        (a) => a.kunde_id ?? a.kunden?.id ?? null,
        (a) => auftragKundenName(a)
      ),
    [sorted]
  )

  const listenGruppen = useMemo(() => {
    if (darstellung === 'kunde') return kundenGruppen
    return [{ key: 'liste', label: '', items: sorted.map((r) => r.auftrag) }]
  }, [darstellung, kundenGruppen, sorted])

  const phaseChipOptions = useMemo(
    () =>
      PHASE_FILTERS.map((o) => ({
        label: o.label,
        value: o.value,
        count: countAuftragPipelinePhase(auftraege, pipelineKontextByAuftragId, o.value),
      })),
    [auftraege, pipelineKontextByAuftragId]
  )

  function pipelineHinweis(a: AuftragListeEintrag): string | null {
    return abrechnungPipelineLabel(
      pipelineKontextByAuftragId[a.id] ?? leereAuftragPipelineKontext()
    )
  }

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    if (!statusList?.length && phase && phase !== 'aktiv') {
      const label = PHASE_FILTERS.find((p) => p.value === phase)?.label
      if (label) t.push({ id: 'phase', label, onRemove: () => setPhase('aktiv') })
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
      t.push({ id: 'q', label: `„${q.trim()}“`, onRemove: () => setQ('') })
    }
    return t
  }, [phase, statusList, zeitraum, q])

  const hasActiveFilters = !!((!statusList?.length && phase && phase !== 'aktiv') || zeitraum !== 'alle' || q.trim() || darstellung !== 'liste')

  function resetFilters() {
    setPhase('aktiv')
    setDarstellung('liste')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
    resetSort()
  }

  function openDetail(id: string) {
    router.push(`/auftraege/${id}`)
  }

  const isPane = mode === 'pane'

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chipGroups={
          !statusList?.length
            ? [
                {
                  label: 'Phase',
                  options: phaseChipOptions,
                  selected: [phase],
                  onChange: (v) => setPhase((v[0] ?? '') as AuftragListenPhase),
                },
                {
                  label: 'Darstellung',
                  options: [
                    { label: 'Liste', value: 'liste', count: filtered.length },
                    { label: 'Nach Kunde', value: 'kunde', count: kundenGruppen.length },
                  ],
                  selected: [darstellung],
                  onChange: (v) => setDarstellung((v[0] ?? 'liste') as 'liste' | 'kunde'),
                },
              ]
            : []
        }
      >
        <ListFilterBar
          hideStatusFilter
          statusLabel="Status"
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
          searchPlaceholder="Aufträge suchen…"
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          tags={filterTags}
          onExportClick={() => setExportOpen(true)}
          resultCount={filtered.length}
          sort={{
            options: [
              { field: 'auftrag_titel', label: 'Auftrag' },
              { field: 'kunde', label: 'Kunde' },
              { field: 'wert', label: 'Wert' },
              { field: 'end_datum', label: 'Lieferdatum' },
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
          icon={Wrench}
          title={
            auftraege.length === 0
              ? 'Keine Aufträge'
              : phase === 'aktiv' &&
                  countAuftragPipelinePhase(auftraege, pipelineKontextByAuftragId, 'aktiv') === 0
                ? 'Keine aktiven Aufträge'
                : 'Keine Treffer'
          }
          description={
            auftraege.length === 0
              ? 'Aufträge aus angenommenen Angeboten erscheinen hier.'
              : phase === 'aktiv' &&
                  countAuftragPipelinePhase(auftraege, pipelineKontextByAuftragId, 'aktiv') === 0
                ? 'Abgeschlossene und vollständig abgerechnete Aufträge findest du unter „Fertig“ oder „Alle“.'
                : 'Filter anpassen.'
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {listenGruppen.map((gruppe) => (
              <div key={gruppe.key} className="space-y-2">
                {gruppe.label ? (
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                    {gruppe.label} ({gruppe.items.length})
                  </p>
                ) : null}
                {gruppe.items.map((a) => {
                  const abrechnungHinweis = pipelineHinweis(a)
                  return (
                <AppEntityListRow
                  key={a.id}
                  href={isPane ? `/auftraege/${a.id}` : undefined}
                  onClick={isPane ? undefined : () => openDetail(a.id)}
                  className={cn(selectedId === a.id && 'ring-2 ring-bw-primary/40')}
                  avatar={<ListAvatar name={auftragKundenName(a)} />}
                  title={auftragKundenName(a)}
                  line2={a.titel?.trim() || '—'}
                  line3={lieferdatumAnzeige(a)}
                  line4={
                    abrechnungHinweis ? (
                      <span>
                        <span className="text-amber-800">{abrechnungHinweis}</span>
                        <span className="text-bw-text-muted"> · {auftragWertAnzeige(a)}</span>
                      </span>
                    ) : (
                      auftragWertAnzeige(a)
                    )
                  }
                  badge={<AuftragStatusBadge status={a.status} />}
                />
                  )
                })}
              </div>
            ))}
          </ListMobileStack>

          <ListGridShell minWidth="980px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div className="list-row-grid head" style={{ gridTemplateColumns: AUFTRAGE_GRID_COLS }}>
              <SortableHeader
                label="Auftrag"
                field="auftrag_titel"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <SortableHeader label="Kunde" field="kunde" currentField={field} currentDir={dir} onSort={handleSort} />
              <div className="text-right">
                <SortableHeader
                  label="Wert"
                  field="wert"
                  currentField={field}
                  currentDir={dir}
                  onSort={handleSort}
                />
              </div>
              <SortableHeader
                label="Lieferdatum"
                field="end_datum"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
              />
              <SortableHeader label="Status" field="status" currentField={field} currentDir={dir} onSort={handleSort} />
            </div>
            {listenGruppen.map((gruppe) => (
              <div key={gruppe.key} className="col-span-full space-y-1">
                {gruppe.label ? (
                  <p className="list-row-grid px-3 py-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                    {gruppe.label} ({gruppe.items.length})
                  </p>
                ) : null}
                {gruppe.items.map((a) => {
                  const abrechnungHinweis = pipelineHinweis(a)
                  return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetail(a.id)
                    }
                  }}
                  className="list-row-grid"
                  style={{ gridTemplateColumns: AUFTRAGE_GRID_COLS }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-bw-text">{auftragTitel(a)}</p>
                    <p className="truncate text-xs text-bw-text-muted">
                      {abrechnungHinweis ? (
                        <span className="text-amber-800">{abrechnungHinweis}</span>
                      ) : (
                        auftragOrt(a)
                      )}
                    </p>
                  </div>
                  <p className="truncate text-[13px] text-bw-text">{auftragKundenName(a)}</p>
                  <p className="text-right text-[13px] font-semibold tabular-nums text-bw-text">
                    {auftragWertAnzeige(a)}
                  </p>
                  <p className="truncate text-[13px] tabular-nums text-bw-text-muted">{lieferdatumAnzeige(a)}</p>
                  <AuftragStatusBadge status={a.status} />
                </div>
                  )
                })}
              </div>
            ))}
          </ListGridShell>
        </>
      )}

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
    </EntityListShell>
  )
}
