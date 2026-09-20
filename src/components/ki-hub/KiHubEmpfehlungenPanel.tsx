'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { useMemo, useState } from 'react'
import { ContentCard } from '@/components/ki-hub/ContentCard'
import { EmpfehlungCard } from '@/components/ki-hub/EmpfehlungCard'
import type { KiEmpfehlungRow, KiHubEmpfehlungenGrouped } from '@/lib/ki-hub/types'
import { cn } from '@/lib/utils'

type EmpCat = 'markt' | 'beobachten' | 'gelernt' | 'marketing'

const CATS: {
  id: EmpCat
  label: string
  icon: string
}[] = [
  { id: 'markt', label: 'Markt-Trends', icon: 'trending-up' },
  { id: 'beobachten', label: 'Beobachten', icon: 'eye' },
  { id: 'gelernt', label: 'Gelernt', icon: 'star' },
  { id: 'marketing', label: 'Marketing-Content', icon: 'message' },
]

type Props = {
  empfehlungen: KiHubEmpfehlungenGrouped
  loading?: boolean
  analyzing?: boolean
  onMarkDone: (id: string) => Promise<void>
  onFirstAnalyze: () => void
}

function konfidenzLabel(daten: unknown): string | null {
  if (!daten || typeof daten !== 'object') return null
  return (daten as { konfidenz?: string }).konfidenz ?? null
}

function marktMeta(row: KiEmpfehlungRow) {
  const d = row.daten_basis as {
    kategorie?: string
    bezug_crm?: string | null
    handlung?: string | null
    quelle_hinweis?: string | null
    relevanz?: string
  } | null
  return d ?? {}
}

export function KiHubEmpfehlungenPanel({
  empfehlungen,
  loading,
  analyzing,
  onMarkDone,
  onFirstAnalyze,
}: Props) {
  const counts = useMemo(
    () => ({
      markt: empfehlungen.markt.length,
      beobachten:
        empfehlungen.beobachten.length +
        empfehlungen.kritisch.length +
        empfehlungen.heute.length,
      gelernt: empfehlungen.gelernt.length,
      marketing: empfehlungen.marketing.length,
    }),
    [empfehlungen]
  )

  const [cat, setCat] = useState<EmpCat>('markt')

  const items = useMemo(() => {
    switch (cat) {
      case 'markt':
        return empfehlungen.markt
      case 'beobachten':
        return [
          ...empfehlungen.kritisch,
          ...empfehlungen.heute,
          ...empfehlungen.beobachten,
        ]
      case 'gelernt':
        return empfehlungen.gelernt
      case 'marketing':
        return empfehlungen.marketing
    }
  }, [cat, empfehlungen])

  const total =
    counts.markt + counts.beobachten + counts.gelernt + counts.marketing

  return (
    <section className="rounded-sheet border border-bw-border bg-white shadow-sm">
      <div className="border-b border-bw-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-bw-text">
          <MockIcon n="sparkles" ctx="default" className="h-4 w-4 text-status-new-text" aria-hidden />
          KI-Empfehlungen
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Nur Ableitungen aus der KI-Analyse — keine Dashboard-KPIs
        </p>
      </div>

      {!loading && total === 0 && !analyzing ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-bw-text">Noch keine Hub-Analyse</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Starte die Analyse — Claude erzeugt Markt-Trends, Beobachtungen, Gelernte und
            Marketing-Content.
          </p>
          <MockBtn className="mt-4 rounded-button bg-bw-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90" type="button" onClick={onFirstAnalyze}>
            Erste Analyse starten
          </MockBtn>
        </div>
      ) : (
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-bw-border p-3 md:flex-col md:overflow-visible md:border-b-0 md:border-r"
            aria-label="Empfehlungs-Kategorien"
          >
            {CATS.map((c) => {
              const n = counts[c.id]
              return (
                <MockBtn className={cn(
                    'flex shrink-0 items-center gap-2 rounded-button px-3 py-2.5 text-left text-fs-meta font-medium transition-colors md:w-full',
                    cat === c.id
                      ? 'bg-bw-green-bg text-bw-primary'
                      : 'text-bw-text hover:bg-bw-bg'
                  )} key={c.id} type="button" onClick={() => setCat(c.id)}>
                  <MockIcon n={c.icon} ctx="nav" size={16} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span
                    className={cn(
                      'tabular-nums text-fs-caption',
                      cat === c.id ? 'opacity-80' : 'text-muted'
                    )}
                  >
                    {n}
                  </span>
                </MockBtn>
              )
            })}
          </nav>

          <div className="min-w-0 space-y-3 p-3 md:p-4">
            {items.length === 0 ? (
              <div className="rounded-sheet border border-dashed border-bw-border bg-bw-bg px-4 py-10 text-center">
                <MockEmpty title="Keine Einträge in dieser Kategorie" />
              </div>
            ) : cat === 'marketing' ? (
              items.map((e) => (
                <ContentCard key={e.id} empfehlung={e} onMarkDone={onMarkDone} />
              ))
            ) : cat === 'gelernt' ? (
              items.map((item) => {
                const konf = konfidenzLabel(item.daten_basis)
                return (
                  <div
                    key={item.id}
                    className="rounded-sheet border border-bw-border bg-surface px-4 py-3"
                  >
                    <p className="text-sm font-medium text-bw-text">{item.titel}</p>
                    {item.beschreibung ? (
                      <p className="mt-1 text-sm text-muted">{item.beschreibung}</p>
                    ) : null}
                    {konf ? (
                      <p className="mt-2 text-xs text-bw-primary">Konfidenz: {konf}</p>
                    ) : null}
                  </div>
                )
              })
            ) : cat === 'markt' ? (
              items.map((item) => {
                const m = marktMeta(item)
                return (
                  <article
                    key={item.id}
                    className="rounded-sheet border border-bw-border bg-surface p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-pill bg-bw-green-bg px-2 py-0.5 text-fs-caption font-semibold uppercase tracking-wide text-bw-primary">
                        {m.relevanz ? `P2 ${m.relevanz}` : 'Markt'}
                      </span>
                      {m.kategorie ? (
                        <span className="text-fs-caption text-muted">{m.kategorie}</span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-semibold text-bw-text">{item.titel}</h3>
                    {item.beschreibung ? (
                      <p className="mt-2 text-sm leading-relaxed text-bw-text">
                        {item.beschreibung}
                      </p>
                    ) : null}
                    {m.handlung ? (
                      <p className="mt-2 text-sm text-bw-primary">{m.handlung}</p>
                    ) : null}
                    {m.bezug_crm ? (
                      <p className="mt-1 text-xs text-muted">CRM: {m.bezug_crm}</p>
                    ) : null}
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <MockCheckbox
                        className="rounded-card border-bw-border"
                        onChange={() => void onMarkDone(item.id)}
                      />
                      erledigt?
                    </label>
                  </article>
                )
              })
            ) : (
              items.map((e) => (
                <EmpfehlungCard key={e.id} empfehlung={e} onMarkDone={onMarkDone} />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}
