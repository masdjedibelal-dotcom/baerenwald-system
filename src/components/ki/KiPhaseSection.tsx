'use client'

import { MockBtn } from '@/components/mock-ui'
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
        <MockBtn
          type="button"
          kind="secondary"
          sm
          loading={loading}
          onClick={() => onRefreshPhase(phase.id)}
        >
          Phase aktualisieren
        </MockBtn>
      </div>

      {hasData ? (
        children
      ) : (
        <div className="rounded-sheet border border-dashed border-bw-border bg-bw-bg/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">Noch keine Daten für diese Phase.</p>
          <MockBtn
            type="button"
            kind="ghost"
            sm
            disabled={loading}
            onClick={() => onRefreshPhase(phase.id)}
            className="mt-2 text-sm font-medium text-bw-primary"
          >
            Phase jetzt berechnen
          </MockBtn>
        </div>
      )}
    </section>
  )
}
