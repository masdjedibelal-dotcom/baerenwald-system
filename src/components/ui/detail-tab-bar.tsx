'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DetailTabItem = {
  id: string
  label: string
  icon?: LucideIcon
  count?: number
}

/** Gesteuerte Tab-Leiste im Wireframe-Stil (`.tabs` / `.tab` / `.tab-count`). */
export function DetailTabBar({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: DetailTabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('tabs', className)} role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn('tab', active && 'active')}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
            {tab.label}
            {tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
