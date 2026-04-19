'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  children: ReactNode[]
  defaultTab?: string
}

export function Tabs({ tabs, children, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '')
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active)
  )

  return (
    <div>
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn('tab', active === tab.id && 'active')}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="ml-1 text-xs opacity-60">({tab.count})</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="animate-fade-in">{children[activeIndex]}</div>
    </div>
  )
}
