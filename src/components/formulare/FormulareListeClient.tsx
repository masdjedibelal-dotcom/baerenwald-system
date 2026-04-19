'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import type { FormularTemplate } from '@/lib/types'
import {
  FORMULAR_PHASE_LABELS,
  cn,
} from '@/lib/utils'
import {
  type FormularListenFilter,
  subtypKurzLabel,
  templatePasstZuListenFilter,
} from '@/lib/formular-constants'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'

const FILTER_CHIPS: { value: FormularListenFilter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'bautagebuch', label: 'Bautagebuch' },
  { value: 'checkliste', label: 'Checkliste' },
  { value: 'pruefprotokoll', label: 'Prüfprotokoll' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function FormulareListeClient({ templates }: { templates: FormularTemplate[] }) {
  const [chip, setChip] = useState<FormularListenFilter>('alle')
  const [modal, setModal] = useState<FormularTemplate | null>(null)

  const filtered = useMemo(() => {
    return templates.filter((t) =>
      templatePasstZuListenFilter(t.subtyp ?? null, t.phase ?? null, chip)
    )
  }, [templates, chip])

  return (
    <div className="pb-8">
      <PageHeader
        title="Formular-Templates"
        action={
          <Link href="/formulare/neu" className="btn btn-primary btn-sm inline-flex items-center justify-center">
            + Neues Template
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setChip(c.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm transition-colors',
              chip === c.value
                ? 'bg-bw-accent font-medium text-white'
                : 'border border-bw-border bg-bw-card text-bw-text hover:bg-bw-hover'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-bw-light">Keine Templates für diesen Filter.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <Card className="flex h-full flex-col p-4">
                <h2 className="text-base font-semibold text-bw-text">{t.name}</h2>
                <p className="mt-1 text-sm text-bw-light">
                  {subtypKurzLabel(t.subtyp ?? undefined)} ·{' '}
                  {t.phase ? FORMULAR_PHASE_LABELS[t.phase] ?? t.phase : '—'}
                </p>
                <p className="mt-2 text-sm text-bw-mid">{t.felder?.length ?? 0} Felder</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Link
                    href={`/formulare/${t.id}/bearbeiten`}
                    className="btn btn-primary inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 text-sm"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Bearbeiten
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 text-sm"
                    onClick={() => setModal(t)}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    Vorschau
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FormularVorschauModal
        open={!!modal}
        onClose={() => setModal(null)}
        name={modal?.name ?? ''}
        felder={modal?.felder ?? []}
      />
    </div>
  )
}
