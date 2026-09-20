'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockTabs } from '@/components/mock-ui/MockTabs'
import { usePathname } from 'next/navigation'
import { activeEinstellungenTab, EINSTELLUNGEN_TABS } from '@/lib/einstellungen-tabs'

export function EinstellungenTabNav({ teamCount }: { teamCount?: number }) {
  const pathname = usePathname()
  const active = activeEinstellungenTab(pathname)

  return (
    <MockTabs
      items={EINSTELLUNGEN_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        href: tab.href,
        iconNode: <MockIcon n={tab.mockIcon} ctx="tab" size={16} className="opacity-80" />,
        count: tab.id === 'team' && teamCount != null && teamCount > 0 ? teamCount : undefined,
      }))}
      value={active}
      aria-label="Einstellungen Bereiche"
      className="tabs mb-0 px-4 md:mb-5 md:px-0"
      tabClassName="tab"
      activeClassName="active"
      showIcons={false}
    />
  )
}
