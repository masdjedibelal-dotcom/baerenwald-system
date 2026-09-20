'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockTabs, type MockTabItem } from '@/components/mock-ui/MockTabs'
import type { MockIconName } from '@/lib/mock-icons'
import type { ReactNode } from 'react'
import { useState } from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number
  icon?: MockIconName | string
}

interface TabsProps {
  tabs: TabItem[]
  children: ReactNode[]
  defaultTab?: string
}

/** Thin-Wrapper — Tabs-Chrome über MockTabs. */
export function Tabs({ tabs, children, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '')
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active)
  )

  const items: MockTabItem[] = tabs.map((tab) => {
    return {
      id: tab.id,
      label: tab.label,
      count: tab.count,
      iconNode: tab.icon ? <MockIcon n={tab.icon} ctx="tab" size={16} className="opacity-70" /> : undefined,
    }
  })

  return (
    <div>
      <MockTabs
        items={items}
        value={active}
        onChange={setActive}
        className="tabs"
        tabClassName="tab"
        showIcons={false}
      />
      <div className="animate-fade-in">{children[activeIndex]}</div>
    </div>
  )
}
