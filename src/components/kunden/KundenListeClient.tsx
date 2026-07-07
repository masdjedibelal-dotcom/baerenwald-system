'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
import { StatusBadge } from '@/components/ui/StatusBadge'
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
import type { Kunde } from '@/lib/types'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { KundeModal } from '@/components/kunden/KundeModal'
import { FilterChips } from '@/components/ui/FilterChips'

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'kundennummer', label: 'Kundennummer' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'typ', label: 'Typ' },
  { key: 'plz', label: 'PLZ' },
  { key: 'ort', label: 'Ort' },
  { key: 'gesamt_umsatz', label: 'Umsatz' },
  { key: 'created_at', label: 'Erstellt am' },
]

function formatEur(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function kundeRegion(k: KundeListeZeile) {
  const plz = k.plz?.trim()
  const ort = k.ort?.trim()
  if (plz && ort) return `${plz} ${ort}`
  return plz || ort || '—'
}

function kundeListStatusBadge(k: KundeListeZeile) {
  const auf = k.anzahl_auftraege ?? 0
  if (auf > 0) return <StatusBadge status="order" label="Aktiv" />
  if ((k.anzahl_leads ?? 0) > 0) return <StatusBadge status="contacted" label="Interessent" />
  return <StatusBadge status="new" label="Neu" />
}

const KUNDEN_GRID_COLS = '42px minmax(200px,2fr) minmax(160px,1.2fr) minmax(100px,1fr) 80px 120px 90px'

type SortRow = {
  row: KundeListeZeile
  name: string
  projekte: number
  umsatz: number
}

type TypListenFilter = 'alle' | 'privat' | 'gewerbe' | 'hausverwaltung'

function kundeListenName(k: KundeListeZeile): string {
  return kundeDisplayName(k)
}

export function KundenListeClient({
  kunden,
  mode = 'page',
  selectedId = null,
}: {
  kunden: KundeListeZeile[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editKunde, setEditKunde] = useState<Kunde | null>(null)
  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  function closeNeuModal() {
    setModalOpen(false)
    setEditKunde(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('neu')
    const q = params.toString()
    router.replace(q ? `/kunden?${q}` : '/kunden', { scroll: false })
  }

  function openNeuModal() {
    setEditKunde(null)
    setModalOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set('neu', '1')
    router.replace(`/kunden?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') {
      setEditKunde(null)
      setModalOpen(true)
    }
  }, [searchParams])

  const dateRange = useMemo(
    () => getZeitraumRange(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  const typCounts = useMemo(() => {
    let privat = 0
    let gewerbe = 0
    let hausverwaltung = 0
    for (const k of kunden) {
      const t = (k.typ || '').toLowerCase()
      if (t === 'gewerbe') gewerbe++
      else if (t === 'hausverwaltung') hausverwaltung++
      else privat++
    }
    return { alle: kunden.length, privat, gewerbe, hausverwaltung }
  }, [kunden])

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return kunden.filter((k) => {
      if (typFilter !== 'alle' && (k.typ || '').toLowerCase() !== typFilter) return false
      if (dateRange && !datumInZeitraum(k.created_at, dateRange)) return false
      if (!needle) return true
      const pool = [
        kundeListenName(k),
        k.name,
        k.email ?? '',
        k.telefon ?? '',
        k.kundennummer ?? '',
        k.plz ?? '',
        k.ort ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return pool.includes(needle)
    })
  }, [kunden, typFilter, debouncedQ, dateRange])

  const sortRows: SortRow[] = useMemo(
    () =>
      filtered.map((k) => ({
        row: k,
        name: kundeListenName(k),
        projekte: k.anzahl_auftraege ?? 0,
        umsatz: k.gesamt_umsatz ?? 0,
      })),
    [filtered]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  const hasFilters = !!(typFilter !== 'alle' || zeitraum !== 'alle' || q.trim())

  function resetFilters() {
    setTypFilter('alle')
    setQ('')
    setZeitraum('alle')
    setCustomFrom('')
    setCustomTo('')
  }

  const filterTags = useMemo((): FilterTag[] => {
    const t: FilterTag[] = []
    // Kundentyp steht bereits in FilterChips
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
    if (q.trim()) t.push({ id: 'q', label: q.trim(), onRemove: () => setQ('') })
    return t
  }, [typFilter, zeitraum, q])

  function toExportRow(k: KundeListeZeile) {
    return {
      name: kundeListenName(k),
      kundennummer: k.kundennummer ?? '',
      email: k.email ?? '',
      telefon: k.telefon ?? '',
      typ: k.typ,
      plz: k.plz ?? '',
      ort: k.ort ?? '',
      gesamt_umsatz: k.gesamt_umsatz ?? '',
      created_at: k.created_at,
    }
  }

  function openDetail(id: string) {
    router.push(`/kunden/${id}`)
  }

  const isPane = mode === 'pane'

  return (
    <EntityListShell
      mode={mode}
      filters={
      <ListFilterSection
        chipGroups={[
          {
            label: 'Kundentyp',
            options: [
              { label: 'Alle', value: 'alle', count: typCounts.alle },
              { label: 'Privat', value: 'privat', count: typCounts.privat },
              { label: 'Gewerbe', value: 'gewerbe', count: typCounts.gewerbe },
              { label: 'Hausverwaltung', value: 'hausverwaltung', count: typCounts.hausverwaltung },
            ],
            selected: [typFilter],
            onChange: (vals) => setTypFilter((vals[0] as TypListenFilter) || 'alle'),
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
          searchPlaceholder="Name, E-Mail, Telefon, Nr."
          onReset={resetFilters}
          hasActiveFilters={hasFilters}
          tags={filterTags}
          onExportClick={() => setExportOpen(true)}
          resultCount={filtered.length}
          sort={{
            options: [
              { field: 'name', label: 'Kunde' },
              { field: 'projekte', label: 'Aufträge' },
              { field: 'umsatz', label: 'Umsatz' },
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
          icon={Users}
          title={kunden.length === 0 ? 'Noch keine Kunden' : 'Keine Treffer'}
          description={
            kunden.length === 0
              ? 'Kunden werden automatisch angelegt, wenn Anfragen eingehen, oder du legst sie manuell an.'
              : 'Filter anpassen.'
          }
          action={
            kunden.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={openNeuModal}>
                + Ersten Kunden anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ListMobileStack className={cn(isPane && 'min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2')}>
            {sorted.map(({ row: k }) => (
              <AppEntityListRow
                key={k.id}
                href={isPane ? `/kunden/${k.id}` : undefined}
                onClick={isPane ? undefined : () => openDetail(k.id)}
                className={cn(selectedId === k.id && 'ring-2 ring-bw-primary/40')}
                avatar={<ListAvatar name={kundeListenName(k)} />}
                title={kundeListenName(k)}
                line2={`${k.telefon?.trim() || k.email?.trim() || '—'} · ${kundeRegion(k)}`}
                line3={
                  k.kundennummer?.trim()
                    ? `Nr. ${k.kundennummer.trim()} · ${k.anzahl_auftraege ?? 0} Aufträge`
                    : `${k.anzahl_auftraege ?? 0} Aufträge`
                }
                line4={(k.gesamt_umsatz ?? 0) > 0 ? formatEur(k.gesamt_umsatz) : undefined}
                badge={kundeListStatusBadge(k)}
              />
            ))}
          </ListMobileStack>

          <ListGridShell minWidth="880px" className={cn('hidden md:block', isPane && 'min-[900px]:hidden')}>
            <div
              className="list-row-grid head"
              style={{ gridTemplateColumns: KUNDEN_GRID_COLS }}
            >
              <div />
              <SortableHeader label="Name" field="name" currentField={field} currentDir={dir} onSort={handleSort} />
              <div>Kontakt</div>
              <div>Region</div>
              <SortableHeader
                label="Aufträge"
                field="projekte"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
                className="justify-end text-right"
              />
              <SortableHeader
                label="Umsatz"
                field="umsatz"
                currentField={field}
                currentDir={dir}
                onSort={handleSort}
                className="justify-end text-right"
              />
              <div>Status</div>
            </div>
              {sorted.map(({ row: k }) => (
              <div
                key={k.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(k.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(k.id)
                  }
                }}
                className={cn('list-row-grid', selectedId === k.id && isPane && 'ring-2 ring-bw-primary/40')}
                style={{ gridTemplateColumns: KUNDEN_GRID_COLS }}
              >
                <ListAvatar name={kundeListenName(k)} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-bw-text">{kundeListenName(k)}</p>
                  <p className="truncate text-xs text-bw-text-muted">{k.kundennummer ?? '—'}</p>
                </div>
                <div className="min-w-0 text-[12.5px]">
                  {k.telefon?.trim() ? (
                    <p className="truncate text-bw-primary">{k.telefon}</p>
                  ) : null}
                  <p className="truncate text-bw-text-muted">{k.email?.trim() || '—'}</p>
                </div>
                <p className="truncate text-[13px] text-bw-text">{kundeRegion(k)}</p>
                <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                  {k.anzahl_auftraege ?? 0}
                </p>
                <p
                  className={cn(
                    'text-right text-[13px] font-medium tabular-nums',
                    (k.gesamt_umsatz ?? 0) > 0 ? 'text-bw-primary' : 'text-bw-text-muted'
                  )}
                >
                  {formatEur(k.gesamt_umsatz)}
                </p>
                {kundeListStatusBadge(k)}
              </div>
            ))}
          </ListGridShell>
        </>
      )}

      <KundeModal open={modalOpen} onClose={closeNeuModal} editKunde={editKunde} />

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Kunden exportieren"
        fields={EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : kunden
          const data = source.map(toExportRow)
          const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'kunden')
        }}
      />
    </EntityListShell>
  )
}
