'use client'

import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { KiPhase } from '@/lib/ki/constants'

type Props = {
  phase: KiPhase
  summary?: string
  loading: boolean
  onRefreshPhase: (phaseId: string) => void
  children: ReactNode
  hasData: boolean
}

export function KiPhaseSection({
  phase,
  summary,
  loading,
  onRefreshPhase,
  children,
  hasData,
}: Props) {
  return (
    <section id={`ki-phase-${phase.id}`} className="scroll-mt-36 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-bw-border pb-2">
        <div>
          <h2 className="text-base font-semibold text-bw-text">{phase.label}</h2>
          {summary ? <p className="mt-0.5 max-w-2xl text-sm text-muted">{summary}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onRefreshPhase(phase.id)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bw-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-bw-bg hover:text-bw-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Phase aktualisieren
        </button>
      </div>

      {hasData ? (
        children
      ) : (
        <div className="rounded-xl border border-dashed border-bw-border bg-bw-bg/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">Noch keine Daten für diese Phase.</p>
          <button
            type="button"
            onClick={() => onRefreshPhase(phase.id)}
            disabled={loading}
            className="mt-2 text-sm font-medium text-bw-primary hover:underline"
          >
            Phase jetzt berechnen
          </button>
        </div>
      )}
    </section>
  )
}
