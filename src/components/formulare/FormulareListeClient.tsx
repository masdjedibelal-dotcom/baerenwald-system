'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'
import { SidePanel } from '@/components/ui/SidePanel'
import { FormularBearbeitenPanel } from '@/components/formulare/FormularBearbeitenPanel'
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

function passtZuFilter(f: TemplateRow, filter: FilterKey): boolean {
  if (filter === 'alle') return true
  if (filter === 'sonstiges') return !f.subtyp || f.subtyp === 'sonstiges'
  return f.subtyp === filter
}

export function FormulareListeClient({ templates }: { templates: FormularTemplate[] }) {
  const router = useRouter()
  const formulare = templates as TemplateRow[]
  const [filter, setFilter] = useState<FilterKey>('alle')
  const [modal, setModal] = useState<FormularTemplate | null>(null)
  const [selected, setSelected] = useState<TemplateRow | null>(null)
  const [editFormular, setEditFormular] = useState<TemplateRow | null>(null)
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

  const filtered = useMemo(
    () => formulare.filter((f) => passtZuFilter(f, filter)),
    [formulare, filter]
  )

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
    <div className="space-y-4 px-4 py-4 md:px-6">
      <PageHeader
        title="Formular-Templates"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value as SortKey)}
              className="input w-auto text-sm min-w-[10rem]"
              aria-label="Sortierung"
            >
              <option value="neueste">Neueste zuerst</option>
              <option value="name">Name A–Z</option>
              <option value="felder">Meiste Felder</option>
            </select>
            <Link href="/formulare/neu" className="btn btn-primary btn-sm inline-flex items-center justify-center">
              + Neues Template
            </Link>
          </div>
        }
      />

      <div className="sticky top-14 z-10 -mx-4 border-b border-bw-border bg-bw-bg px-4 py-3 md:-mx-6 md:px-6">
        <FilterChips
          options={filterOptionen}
          selected={[filter]}
          onChange={(vals) => setFilter((vals[0] as FilterKey) || 'alle')}
        />
      </div>

      <div>
        {sorted.length === 0 ? (
          <p className="py-6 text-sm text-bw-light">Keine Templates für diesen Filter.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {sorted.map((formular) => (
              <li key={formular.id}>
                <ListCard
                  title={formular.name}
                  subtitle={
                    `${formular.felder?.length || 0} Felder` + (formular.subtyp ? ` · ${formular.subtyp}` : '')
                  }
                  meta={formatRelativeDate(formular.updated_at || formular.created_at || '')}
                  tags={!formular.aktiv ? ['Inaktiv'] : undefined}
                  onClick={() => setSelected(formular)}
                  actions={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditFormular(formular)
                      }}
                      className="rounded-md p-2 text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
                      aria-label="Bearbeiten"
                    >
                      ✏️
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <SidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={
          selected
            ? `${selected.subtyp || 'Sonstiges'} · ${selected.felder?.length ?? 0} Felder`
            : undefined
        }
        width="md"
      >
        {selected ? (
          <div className="space-y-4 p-5">
            <div>
              <div className="text-base font-semibold text-bw-text">{selected.name}</div>
              <div className="mt-1 text-xs text-bw-text-muted">
                {selected.subtyp || 'Sonstiges'} · {selected.felder?.length ?? 0} Felder
              </div>
            </div>

            {selected.felder && selected.felder.length > 0 ? (
              <div className="space-y-1">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-bw-text-muted">Felder</div>
                {selected.felder.slice(0, 5).map((f, i) => (
                  <div key={f.id ?? i} className="flex items-center gap-2 py-1 text-sm text-bw-text">
                    <span className="flex-1 truncate">{f.label}</span>
                    {f.pflicht ? <span className="text-xs text-bw-accent">*</span> : null}
                  </div>
                ))}
                {selected.felder.length > 5 ? (
                  <div className="text-xs text-bw-text-muted">+ {selected.felder.length - 5} weitere Felder</div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2 border-t border-bw-border pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditFormular(selected)
                  setSelected(null)
                }}
                className="btn btn-primary btn-sm w-full"
              >
                ✏️ Bearbeiten
              </button>
              <button type="button" onClick={() => setModal(selected)} className="btn btn-secondary btn-sm w-full">
                👁️ Vorschau
              </button>
            </div>
          </div>
        ) : null}
      </SidePanel>

      <SidePanel
        open={!!editFormular}
        onClose={() => setEditFormular(null)}
        title={editFormular?.name || 'Formular bearbeiten'}
        width="lg"
      >
        {editFormular ? (
          <FormularBearbeitenPanel
            key={editFormular.id}
            formular={editFormular}
            onSave={() => {
              setEditFormular(null)
              router.refresh()
            }}
            onClose={() => setEditFormular(null)}
          />
        ) : null}
      </SidePanel>

      <FormularVorschauModal
        open={!!modal}
        onClose={() => setModal(null)}
        name={modal?.name ?? ''}
        felder={modal?.felder ?? []}
      />
    </div>
  )
}
