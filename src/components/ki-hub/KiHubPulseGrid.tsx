'use client'

import type { KiHubPulseCard } from '@/lib/ki-hub/types'

const STATUS_DOT: Record<KiHubPulseCard['status'], string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  critical: 'bg-red-500',
  neutral: 'bg-gray-300',
}

type Props = {
  cards: KiHubPulseCard[]
}

export function KiHubPulseGrid({ cards }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-xl border border-bw-border bg-bw-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-bw-text">{card.label}</p>
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[card.status]}`}
              aria-hidden
            />
          </div>
          <dl className="mt-3 space-y-1">
            {card.kpis.map((kpi) => (
              <div key={kpi.label} className="flex justify-between gap-2 text-xs">
                <dt className="text-muted">{kpi.label}</dt>
                <dd className="font-medium text-bw-text">{kpi.value}</dd>
              </div>
            ))}
          </dl>
          {card.hint ? (
            <p className="mt-2 text-xs text-amber-800">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
