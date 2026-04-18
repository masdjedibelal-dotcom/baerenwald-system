'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type SearchCtx = {
  open: () => void
  close: () => void
  isOpen: boolean
}

const SearchContext = createContext<SearchCtx | null>(null)

export function SearchProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setOpen] = useState(false)
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchModal() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearchModal outside SearchProvider')
  return ctx
}
