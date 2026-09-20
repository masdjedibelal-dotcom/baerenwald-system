'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import type { KiAnalyticsMeta } from '@/lib/ki/analytics-meta'
import { KI_PHASEN } from '@/lib/ki/constants'

type Props = {
  meta: KiAnalyticsMeta
  onJump: (phaseId: string) => void
}

export function KiJourneyBand({ onJump }: Props) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
      aria-label="Projekt-Journey"
    >
      {KI_PHASEN.map((phase, i) => (
        <div key={phase.id} className="flex shrink-0 items-center gap-2 snap-start">
          {i > 0 ? <MockIcon n="arrow-right" ctx="default" className="h-4 w-4 text-muted" aria-hidden /> : null}
          <MockBtn className="min-w-[5.5rem] rounded-button border border-bw-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-bw-primary/40 hover:bg-bw-green-bg/30" type="button" onClick={() => onJump(phase.id)}>
            <p className="text-fs-caption font-medium uppercase tracking-wide text-muted">
              {i + 1}. {phase.journeyLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-bw-text">
              {phase.label.replace(/^[①②③④⑤]\s*/, '')}
            </p>
          </MockBtn>
        </div>
      ))}
    </nav>
  )
}
