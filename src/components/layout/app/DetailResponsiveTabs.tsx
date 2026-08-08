'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { DetailScreenShell } from '@/components/layout/app/DetailScreenShell'

type DetailResponsiveTabsProps<T extends string> = {
  tab: T
  onTabChange: (tab: T) => void
  desktopOverview: ReactNode
  desktopTabs: ReactNode
  mobileTabs: ReactNode
  desktopTabContent: ReactNode
  mobileTabContent: ReactNode
  mobileDefaultTab: T
  desktopDefaultTab: T
  mobileTabIds: readonly T[]
  desktopTabIds: readonly T[]
}

/** Desktop: feste Übersicht + Tabs darunter. Mobile: sticky Tabs oben, Inhalt nur im aktiven Tab. */
export function DetailResponsiveTabs<T extends string>({
  tab,
  onTabChange,
  desktopOverview,
  desktopTabs,
  mobileTabs,
  desktopTabContent,
  mobileTabContent,
  mobileDefaultTab,
  desktopDefaultTab,
  mobileTabIds,
  desktopTabIds,
}: DetailResponsiveTabsProps<T>) {
  const isMobile = useIsMobile()
  const prevMobile = useRef<boolean | undefined>(undefined)

  useEffect(() => {
    if (prevMobile.current === undefined) {
      prevMobile.current = isMobile
      if (isMobile && tab !== mobileDefaultTab) {
        onTabChange(mobileDefaultTab)
      }
      return
    }

    if (prevMobile.current !== isMobile) {
      if (isMobile) {
        onTabChange(mobileDefaultTab)
      } else if (!desktopTabIds.includes(tab)) {
        onTabChange(desktopDefaultTab)
      }
      prevMobile.current = isMobile
      return
    }

    const allowed = isMobile ? mobileTabIds : desktopTabIds
    if (!allowed.includes(tab)) {
      onTabChange(isMobile ? mobileDefaultTab : desktopDefaultTab)
    }
  }, [
    isMobile,
    tab,
    onTabChange,
    mobileDefaultTab,
    desktopDefaultTab,
    mobileTabIds,
    desktopTabIds,
  ])

  if (isMobile) {
    return (
      <DetailScreenShell tabs={mobileTabs}>
        <div className="min-w-0 space-y-3">{mobileTabContent}</div>
      </DetailScreenShell>
    )
  }

  return (
    <>
      {desktopOverview}
      <DetailScreenShell tabs={desktopTabs}>
        <div className="min-w-0 space-y-3">{desktopTabContent}</div>
      </DetailScreenShell>
    </>
  )
}
