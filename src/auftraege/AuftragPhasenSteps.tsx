'use client'

import { AUFTRAG_PHASEN, auftragPhasenStates, type AuftragPhaseState } from '@/lib/auftrag-phasen'
import type { AuftragStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function PhaseDot({ state }: { state: AuftragPhaseState }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        state === 'fertig' && 'bg-bw-primary',
        state === 'aktuell' && 'bg-[#D9A800]',
        state === 'offen' && 'bg-bw-border-strong'
      )}
      aria-hidden
    />
  )
}

export function AuftragPhasenSteps({
  status,
  hatAngebot,
}: {
  status: AuftragStatus
  hatAngebot: boolean
}) {
  const states = auftragPhasenStates({ status, hatAngebot })

  return (
    <ul className="mt-4 space-y-1.5 border-t border-bw-border pt-4" aria-label="Projektphasen">
      {AUFTRAG_PHASEN.map((p) => {
        const state = states[p.id]
        return (
          <li key={p.id} className="flex items-center gap-2 text-[13px]">
            <PhaseDot state={state} />
            <span
              className={cn(
                state === 'offen' ? 'text-bw-text-muted' : 'text-bw-text',
                state === 'aktuell' && 'font-medium'
              )}
            >
              {p.label}
            </span>
            {state === 'aktuell' ? (
              <span className="badge badge-contacted text-[10px]">aktiv</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
