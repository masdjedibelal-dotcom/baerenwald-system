'use client'

import { createContext, useContext, type ReactNode } from 'react'

/** Mount-Punkt für mobil Header-⋯ (EntityDetailLayout → DetailActionsBar). */
const DetailMobileTopSlotContext = createContext<HTMLElement | null>(null)

export function DetailMobileTopSlotProvider({
  host,
  children,
}: {
  host: HTMLElement | null
  children: ReactNode
}) {
  return (
    <DetailMobileTopSlotContext.Provider value={host}>
      {children}
    </DetailMobileTopSlotContext.Provider>
  )
}

export function useDetailMobileTopSlot(): HTMLElement | null {
  return useContext(DetailMobileTopSlotContext)
}
