'use client'

import { Search } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface TopBarProps {
  user: User
}

export function TopBar({ user }: TopBarProps) {
  const openSearch = () => {
    document.dispatchEvent(new CustomEvent('open-search'))
  }

  return (
    <header className="hidden h-14 flex-shrink-0 items-center justify-between border-b border-bw-border bg-bw-card px-6 py-3 md:flex">
      <div id="breadcrumb-portal" className="flex items-center gap-1 text-sm text-bw-light" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openSearch}
          className="flex items-center gap-2 rounded-md bg-bw-hover px-3 py-1.5 text-sm text-bw-light transition-colors hover:bg-bw-border"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:block">Suchen</span>
          <kbd className="hidden rounded bg-bw-border px-1.5 py-0.5 font-mono text-xs text-bw-light lg:block">⌘K</kbd>
        </button>

        <div
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-bw-accent text-sm font-medium text-white"
          title={user.email ?? ''}
        >
          {user.email?.[0].toUpperCase() ?? 'B'}
        </div>
      </div>
    </header>
  )
}
