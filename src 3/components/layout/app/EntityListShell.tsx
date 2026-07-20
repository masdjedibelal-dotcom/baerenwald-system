'use client'

import type { ReactNode } from 'react'
import { AppListScreen } from '@/components/layout/app/AppListScreen'

type EntityListShellProps = {
  filters: ReactNode
  children: ReactNode
  /** Optionaler PageHeader. */
  header?: ReactNode
  className?: string
}

/** Einheitlicher Wrapper für CRM-Listen (Filter + Inhalt). */
export function EntityListShell({
  filters,
  children,
  header,
  className,
}: EntityListShellProps) {
  return (
    <AppListScreen filters={filters} className={className}>
      {header ?? null}
      <div>{children}</div>
    </AppListScreen>
  )
}
