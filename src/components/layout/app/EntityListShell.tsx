'use client'

import type { ReactNode } from 'react'
import { AppListScreen } from '@/components/layout/app/AppListScreen'
import { cn } from '@/lib/utils'

type EntityListShellProps = {
  filters: ReactNode
  children: ReactNode
  /** Master-Detail-Spalte: kompaktere Filter, kein PageHeader. */
  mode?: 'page' | 'pane'
  /** Optionaler PageHeader (nur page-Modus). */
  header?: ReactNode
  className?: string
}

/** Einheitlicher Wrapper für CRM-Listen (Filter + Inhalt). */
export function EntityListShell({
  filters,
  children,
  mode = 'page',
  header,
  className,
}: EntityListShellProps) {
  const isPane = mode === 'pane'

  return (
    <AppListScreen filters={filters} className={className}>
      {header && !isPane ? header : null}
      <div className={cn(isPane && 'entity-list-pane')}>{children}</div>
    </AppListScreen>
  )
}
