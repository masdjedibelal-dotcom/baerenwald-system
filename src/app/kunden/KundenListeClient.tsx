'use client'

import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ListFilterBar, type FilterTag } from '@/components/ui/ListFilterBar'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useSort } from '@/hooks/useSort'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  getZeitraumRange,
  datumInZeitraum,
  zeitraumLabel,
  type ZeitraumPreset,
} from '@/lib/listZeitraum'
import { formatRelativeDate, formatLeadListDatum, cn } from '@/lib/utils'
import type { Kunde } from '@/lib/types'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'
import { kundenAvatarClass, kundenInitialen } from '@/components/kunden/TypBadge'
import { TypBadge } from '@/components/kunden/TypBadge'
import { KundeSidePanel } from '@/components/kunden/KundeSidePanel'
import { KundeModal } from '@/components/kunden/KundeModal'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'

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

function letzteAktiv(k: KundeListeZeile) {
  return k.letzte_aktivitaet ?? k.created_at
}

function typBadgeClass(typ: string) {
  if (typ === 'gewerbe') return 'badge badge-order'
  if (typ === 'hausverwaltung') return 'badge badge-offer'
  return 'badge badge-new'
}

function typBadgeLabel(typ: string) {
  if (typ === 'gewerbe') return 'Gewerbe'
  if (typ === 'hausverwaltung') return 'Hausverwaltung'
  return 'Privat'
}

type SortRow = {
  row: KundeListeZeile
  name: string
  typ: string
  projekte: number
  umsatz: number
  aktiv: string
}

type TypListenFilter = 'alle' | 'privat' | 'gewerbe' | 'hausverwaltung'

export function KundenListeClient({ kunden }: { kunden: KundeListeZeile[] }) {
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editKunde, setEditKunde] = useState<Kunde | null>(null)
  const [panelId, setPanelId] = useState<string | null>(null)
  const [panelRow, setPanelRow] = useState<KundeListeZeile | null>(null)

  const [typFilter, setTypFilter] = useState<TypListenFilter>('alle')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [zeitraum, setZeitraum] = useState<ZeitraumPreset>('alle')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

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
        name: k.name,
        typ: k.typ,
        projekte: k.anzahl_auftraege ?? 0,
        umsatz: k.gesamt_umsatz ?? 0,
        aktiv: letzteAktiv(k),
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
    if (typFilter !== 'alle') {
      const label = typFilter === 'privat' ? 'Privat' : typFilter === 'gewerbe' ? 'Gewerbe' : 'Hausverwaltung'
      t.push({ id: 'typ', label, onRemove: () => setTypFilter('alle') })
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
    if (q.trim()) t.push({ id: 'q', label: q.trim(), onRemove: () => setQ('') })
    return t
  }, [typFilter, zeitraum, q])

  function toExportRow(k: KundeListeZeile) {
    return {
      name: k.name,
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

  return (
    <div>
      <PageHeader
        title="Kunden"
        breadcrumbs={[{ label: 'Kunden' }]}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExportOpen(true)}>
              ⬇️ Export
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditKunde(null)
                setModalOpen(true)
              }}
            >
              + Neuer Kunde
            </button>
          </div>
        }
      />

      <div className="sticky top-14 z-10 -mx-4 border-b border-bw-border bg-bw-bg px-4 py-3 md:mx-0 md:rounded-lg md:border md:shadow-sm">
        <FilterChips
          options={[
            { label: 'Alle', value: 'alle', count: typCounts.alle },
            { label: 'Privat', value: 'privat', count: typCounts.privat },
            { label: 'Gewerbe', value: 'gewerbe', count: typCounts.gewerbe },
            { label: 'Hausverwaltung', value: 'hausverwaltung', count: typCounts.hausverwaltung },
          ]}
          selected={[typFilter]}
          onChange={(vals) => setTypFilter((vals[0] as TypListenFilter) || 'alle')}
        />
      </div>

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
        className="mb-4"
      />

      <MobileSortSelect
        options={[
          { field: 'name', label: 'Kunde' },
          { field: 'typ', label: 'Typ' },
          { field: 'projekte', label: 'Projekte' },
          { field: 'umsatz', label: 'Umsatz' },
          { field: 'aktiv', label: 'Aktivität' },
        ]}
        currentField={field}
        currentDir={dir}
        onSort={(f) => (f ? handleSort(f) : resetSort())}
      />

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
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditKunde(null)
                  setModalOpen(true)
                }}
              >
                + Ersten Kunden anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="md:hidden">
            {sorted.map(({ row: k }) => (
              <li key={k.id} className="border-b border-bw-border bg-bw-card first:border-t">
                <ListCard
                  title={k.name}
                  badge={<span className={typBadgeClass(k.typ)}>{typBadgeLabel(k.typ)}</span>}
                  subtitle={k.kundennummer ?? undefined}
                  meta={`${k.anzahl_auftraege ?? 0} Projekte · ${(k.gesamt_umsatz ?? 0).toLocaleString('de')} € · ${formatRelativeDate(letzteAktiv(k))}`}
                  onClick={() => {
                    setPanelId(k.id)
                    setPanelRow(k)
                  }}
                />
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-bw-border bg-bw-card shadow-card md:block">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-bg">
                  <th className="px-3 py-3" style={{ width: '32%' }}>
                    <SortableHeader
                      label="Kunde"
                      field="name"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 100 }}>
                    <SortableHeader
                      label="Typ"
                      field="typ"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 100 }}>
                    <SortableHeader
                      label="Projekte"
                      field="projekte"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 120 }}>
                    <SortableHeader
                      label="Umsatz"
                      field="umsatz"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 140 }}>
                    <SortableHeader
                      label="Letzte Aktivität"
                      field="aktiv"
                      currentField={field}
                      currentDir={dir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3" style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ row: k }) => (
                  <tr
                    key={k.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setPanelId(k.id)
                      setPanelRow(k)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPanelId(k.id)
                        setPanelRow(k)
                      }
                    }}
                    className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            kundenAvatarClass(k.typ)
                          )}
                        >
                          {kundenInitialen(k.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-bw-text">{k.name}</p>
                          <p className="text-xs text-bw-light">{k.kundennummer ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <TypBadge typ={k.typ} />
                    </td>
                    <td className="px-3 py-3 text-bw-text">{k.anzahl_auftraege ?? 0}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-bw-text">{formatEur(k.gesamt_umsatz)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-bw-mid">
                      {formatRelativeDate(letzteAktiv(k))}
                      <span className="ml-1 text-xs text-bw-light">
                        ({formatLeadListDatum(letzteAktiv(k))})
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-bw-link">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <KundeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditKunde(null)
        }}
        editKunde={editKunde}
      />

      <KundeSidePanel
        open={!!panelId}
        onClose={() => {
          setPanelId(null)
          setPanelRow(null)
        }}
        kundeId={panelId}
        summary={panelRow}
        onBearbeiten={() => {
          if (panelRow) {
            setEditKunde(panelRow)
            setModalOpen(true)
            setPanelId(null)
            setPanelRow(null)
          }
        }}
      />

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
    </div>
  )
}
