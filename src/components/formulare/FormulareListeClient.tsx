'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ListFilterSection } from '@/components/layout/ListPageParts'
import { AppListScreen, AppEntityListRow } from '@/components/layout/app'
import { ListFilterBar } from '@/components/ui/ListFilterBar'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'
import type { FormularTemplate } from '@/lib/types'
import { formatRelativeDate } from '@/lib/utils'

type TemplateRow = FormularTemplate & { updated_at?: string | null }

type FilterKey =
  | 'alle'
  | 'bautagebuch'
  | 'checkliste'
  | 'pruefprotokoll'
  | 'abnahme'
  | 'sonstiges'

type SortKey = 'neueste' | 'name' | 'felder'

const SUBTYP_LABELS: Record<string, string> = {
  bautagebuch: 'Bautagebuch',
  checkliste: 'Checkliste',
  pruefprotokoll: 'Prüfprotokoll',
  abnahme: 'Abnahme',
  sonstiges: 'Sonstiges',
}

function subtypLabel(subtyp?: string | null) {
  if (!subtyp) return 'Sonstiges'
  return SUBTYP_LABELS[subtyp] ?? subtyp
}

function passtZuFilter(f: TemplateRow, filter: FilterKey): boolean {
  if (filter === 'alle') return true
  if (filter === 'sonstiges') return !f.subtyp || f.subtyp === 'sonstiges'
  return f.subtyp === filter
}

export function FormulareListeClient({ templates }: { templates: FormularTemplate[] }) {
  const formulare = templates as TemplateRow[]
  const [filter, setFilter] = useState<FilterKey>('alle')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [modal, setModal] = useState<FormularTemplate | null>(null)
  const [sortierung, setSortierung] = useState<SortKey>('neueste')

  const filterOptionen = useMemo(
    () => [
      { label: 'Alle', value: 'alle' as const, count: formulare.length },
      {
        label: 'Bautagebuch',
        value: 'bautagebuch' as const,
        count: formulare.filter((f) => f.subtyp === 'bautagebuch').length,
      },
      {
        label: 'Checkliste',
        value: 'checkliste' as const,
        count: formulare.filter((f) => f.subtyp === 'checkliste').length,
      },
      {
        label: 'Prüfprotokoll',
        value: 'pruefprotokoll' as const,
        count: formulare.filter((f) => f.subtyp === 'pruefprotokoll').length,
      },
      {
        label: 'Abnahme',
        value: 'abnahme' as const,
        count: formulare.filter((f) => f.subtyp === 'abnahme').length,
      },
      {
        label: 'Sonstiges',
        value: 'sonstiges' as const,
        count: formulare.filter((f) => !f.subtyp || f.subtyp === 'sonstiges').length,
      },
    ],
    [formulare]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return formulare.filter((f) => {
      if (!passtZuFilter(f, filter)) return false
      if (!needle) return true
      const hay = [f.name, f.subtyp].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [formulare, filter, debouncedQ])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortierung === 'name') return a.name.localeCompare(b.name, 'de')
      if (sortierung === 'felder') return (b.felder?.length || 0) - (a.felder?.length || 0)
      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      )
    })
    return list
  }, [filtered, sortierung])

  return (
    <AppListScreen
      filters={
        <ListFilterSection
          chipGroups={[
            {
              label: 'Typ',
              options: filterOptionen,
              selected: [filter],
              onChange: (vals) => setFilter((vals[0] as FilterKey) || 'alle'),
            },
          ]}
        >
          <ListFilterBar
            hideStatusFilter
            hideZeitraumFilter
            statusLabel="—"
            statusOptions={[{ value: '', label: '—' }]}
            statusValue=""
            onStatusChange={() => {}}
            zeitraumValue="alle"
            onZeitraumChange={() => {}}
            showCustomDates={false}
            customFrom=""
            customTo=""
            onCustomFromChange={() => {}}
            onCustomToChange={() => {}}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Vorlagen suchen…"
            onReset={() => {
              setFilter('alle')
              setQ('')
            }}
            hasActiveFilters={filter !== 'alle' || !!q.trim()}
            resultCount={sorted.length}
            sort={{
              options: [
                { field: 'neueste', label: 'Neueste zuerst' },
                { field: 'name', label: 'Name A–Z' },
                { field: 'felder', label: 'Meiste Felder' },
              ],
              currentField: sortierung,
              currentDir: null,
              onSort: (f) => setSortierung((f || 'neueste') as SortKey),
            }}
          />
        </ListFilterSection>
      }
    >
      <PageHeader
        action={
          <Link
            href="/formulare/neu"
            className="btn btn-primary btn-sm inline-flex items-center justify-center md:hidden"
          >
            + Neues Template
          </Link>
        }
      />

      <div>
        {sorted.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={formulare.length === 0 ? 'Noch keine Formular-Vorlagen' : 'Keine Treffer'}
            description={
              formulare.length === 0
                ? 'Legen Sie ein neues Template an, um Formulare für Handwerker zu nutzen.'
                : 'Filter anpassen.'
            }
            action={
              formulare.length === 0 ? (
                <Link href="/formulare/neu" className="btn btn-primary btn-sm">
                  + Erstes Template anlegen
                </Link>
              ) : null
            }
          />
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {sorted.map((formular) => (
              <li key={formular.id}>
                <AppEntityListRow
                  href={`/formulare/${formular.id}/bearbeiten`}
                  avatar={<ListAvatar name={formular.name} tone="soft" />}
                  title={formular.name}
                  line2={`${formular.felder?.length || 0} Felder · ${subtypLabel(formular.subtyp)}`}
                  line3={formatRelativeDate(formular.updated_at || formular.created_at || '')}
                  badge={
                    !formular.aktiv ? (
                      <span className="rounded-md bg-bw-hover px-2 py-0.5 text-[11px] font-medium text-bw-text-muted">
                        Inaktiv
                      </span>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormularVorschauModal
        open={!!modal}
        onClose={() => setModal(null)}
        name={modal?.name ?? ''}
        felder={modal?.felder ?? []}
      />
    </AppListScreen>
  )
}
