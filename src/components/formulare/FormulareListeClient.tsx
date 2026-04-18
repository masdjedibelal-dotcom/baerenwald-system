'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import type { FormularTemplate } from '@/lib/types'
import { FORMULAR_PHASE_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function FormulareListeClient({ templates }: { templates: FormularTemplate[] }) {
  return (
    <div>
      <PageHeader
        title="Formular-Templates"
        action={
          <Link
            href="/formulare/neu"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:opacity-95"
          >
            + Neues Template
          </Link>
        }
      />

      {templates.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Templates.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Card className="flex h-full flex-col p-4">
                <h2 className="text-base font-semibold text-ink">{t.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.gewerke?.name ? (
                    <span className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink">{t.gewerke.name}</span>
                  ) : (
                    <span className="rounded-md bg-canvas px-2 py-0.5 text-xs text-muted">Alle Gewerke</span>
                  )}
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-medium',
                      t.typ === 'betreuer' ? 'bg-violet-100 text-violet-900' : 'bg-sky-100 text-sky-900'
                    )}
                  >
                    {t.typ === 'betreuer' ? 'Betreuer' : 'Handwerker'}
                  </span>
                  {t.phase ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {FORMULAR_PHASE_LABELS[t.phase] ?? t.phase}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs',
                      t.aktiv ? 'bg-emerald-100 text-emerald-800' : 'bg-muted/30 text-muted'
                    )}
                  >
                    {t.aktiv ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{t.felder?.length ?? 0} Felder</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Link
                    href={`/formulare/${t.id}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-white hover:opacity-95"
                  >
                    Bearbeiten
                  </Link>
                  <Link
                    href={`/formulare/${t.id}/vorschau`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-canvas"
                  >
                    Vorschau
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
