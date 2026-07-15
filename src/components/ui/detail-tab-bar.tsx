'use client'

import type { LucideIcon } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { cn } from '@/lib/utils'

export type DetailTabItem = {
  id: string
  label: string
  /** Bevorzugt: Mock-Icon-Name. */
  iconName?: MockIconName | string
  /** Legacy: direktes Lucide-Icon (vermeiden — lieber iconName). */
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
            {tab.iconName ? (
              <MockIcon n={tab.iconName} size="1em" className="opacity-70" />
            ) : Icon ? (
              <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            ) : null}
            {tab.label}
            {tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
