'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type MockKpiItem = {
  key: string
  label: string
  value: ReactNode
  icon?: ReactNode
}

/** KPI-Zeile wie im Mock (4 Karten, 2×2 mobil). */
export function MockKpiRow({ items, className }: { items: MockKpiItem[]; className?: string }) {
  return (
    <div className={cn('mock-kpi-row grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="mock-kpi-card rounded-xl border border-bw-border bg-[var(--card)] px-3 py-2.5 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs text-bw-text-muted">
            {item.icon ? <span className="shrink-0 opacity-80">{item.icon}</span> : null}
            <span>{item.label}</span>
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums text-bw-text">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
