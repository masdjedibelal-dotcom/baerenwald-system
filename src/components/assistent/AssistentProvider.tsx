'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

type AssistentContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  pathname: string
}

const AssistentContext = createContext<AssistentContextValue | null>(null)

export function AssistentProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? '/'
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const value = useMemo(
    () => ({ open, setOpen, toggle, pathname }),
    [open, toggle, pathname]
  )
  return (
    <AssistentContext.Provider value={value}>{children}</AssistentContext.Provider>
  )
}

export function useAssistent() {
  const ctx = useContext(AssistentContext)
  if (!ctx) throw new Error('useAssistent außerhalb AssistentProvider')
  return ctx
}
