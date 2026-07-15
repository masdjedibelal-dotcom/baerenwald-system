'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Input } from '@/components/ui/Input'
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
    const needle = q.trim().toLowerCase()
    return formulare.filter((f) => {
      if (!passtZuFilter(f, filter)) return false
      if (!needle) return true
      const hay = [f.name, f.subtyp].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [formulare, filter, q])

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
    <div className="space-y-4">
      <MockCard
        title="Formular-Vorlagen"
        icon="forms"
        actions={
          <Link href="/formulare/neu" className="btn btn-primary btn-sm">
            + Neues Template
          </Link>
        }
      >
        <div className="toolbar mb-4 flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Vorlagen suchen…"
            className="min-w-[200px] flex-1"
          />
          <select
            className="input"
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value as SortKey)}
            aria-label="Sortierung"
          >
            <option value="neueste">Neueste zuerst</option>
            <option value="name">Name A–Z</option>
            <option value="felder">Meiste Felder</option>
          </select>
        </div>

        <div className="chiprow mb-4 flex flex-wrap gap-2">
          {filterOptionen.map((opt) => (
            <MockChip
              key={opt.value}
              active={filter === opt.value}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              {opt.count > 0 ? ` (${opt.count})` : ''}
            </MockChip>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="space-y-3">
            <MockEmpty
              icon="forms"
              title={formulare.length === 0 ? 'Noch keine Formular-Vorlagen' : 'Keine Treffer'}
              hint={
                formulare.length === 0
                  ? 'Legen Sie ein neues Template an, um Formulare für Handwerker zu nutzen.'
                  : 'Filter anpassen.'
              }
            />
            {formulare.length === 0 ? (
              <Link href="/formulare/neu" className="btn btn-primary btn-sm">
                + Erstes Template anlegen
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="-mx-4">
            {sorted.map((formular) => (
              <li key={formular.id} className="list-row">
                <Link href={`/formulare/${formular.id}/bearbeiten`} className="min-w-0 flex-1">
                  <span className="lc-title block">{formular.name}</span>
                  <span className="lc-sub block">
                    {formular.felder?.length || 0} Felder · {subtypLabel(formular.subtyp)}
                  </span>
                  <span className="text-xs text-muted">
                    {formatRelativeDate(formular.updated_at || formular.created_at || '')}
                  </span>
                </Link>
                {!formular.aktiv ? <span className="badge badge-muted">Inaktiv</span> : null}
                <div className="row-actions always flex items-center gap-1">
                  <button
                    type="button"
                    className="qa-btn"
                    title="Vorschau"
                    aria-label="Vorschau"
                    onClick={() => setModal(formular)}
                  >
                    <MockIcon n="eye" size={16} />
                  </button>
                  <Link href={`/formulare/${formular.id}/bearbeiten`} className="qa-btn" aria-label="Bearbeiten">
                    <MockIcon n="chevron-right" size={16} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MockCard>

      <FormularVorschauModal
        open={!!modal}
        onClose={() => setModal(null)}
        name={modal?.name ?? ''}
        felder={modal?.felder ?? []}
      />
    </div>
  )
}
