'use client'

import { Search } from 'lucide-react'
import { useSearchModal } from '@/components/layout/SearchContext'

export function DashboardTopBar() {
  const { open } = useSearchModal()
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-end border-b border-border bg-canvas/95 px-2 py-2 backdrop-blur-sm md:-mx-8 md:mb-4 md:px-4">
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Suche öffnen"
      >
        <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="hidden md:inline">Suche</span>
        <kbd className="hidden rounded border border-border bg-canvas px-1.5 py-0.5 font-mono text-xs text-muted md:inline">
          ⌘K
        </kbd>
      </button>
    </header>
  )
}
