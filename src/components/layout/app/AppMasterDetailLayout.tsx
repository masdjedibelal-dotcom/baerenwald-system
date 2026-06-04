'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AppMasterDetailLayout({
  basePath,
  list,
  children,
  selectedId,
  fullBleed = false,
}: {
  basePath: string
  list: ReactNode
  children: ReactNode
  selectedId?: string | null
  /** Unterseiten (Wizard, Neu) ohne Split-Layout */
  fullBleed?: boolean
}) {
  const pathname = usePathname()
  const isListRoot = pathname === basePath
  const hasSelection = Boolean(selectedId)

  if (fullBleed) {
    return <div className="min-w-0">{children}</div>
  }

  return (
    <div
      className={cn(
        'app-master-detail',
        hasSelection && 'app-master-detail--selected',
        isListRoot && 'app-master-detail--list-root'
      )}
      data-app-master-detail=""
      data-selected-id={selectedId ?? undefined}
    >
      <aside
        className={cn(
          'app-master-detail-list',
          hasSelection && 'max-[899px]:hidden'
        )}
        aria-label="Liste"
      >
        {list}
      </aside>
      <section
        className={cn(
          'app-master-detail-main min-w-0',
          isListRoot && !hasSelection && 'max-[899px]:hidden'
        )}
        aria-label="Detail"
      >
        <div className="app-detail-pane min-w-0">{children}</div>
      </section>
    </div>
  )
}

export function AppMasterDetailPlaceholder({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="app-master-detail-placeholder hidden min-[900px]:flex">
      <div className="mx-auto max-w-sm px-6 text-center">
        <p className="text-base font-medium text-bw-text">{title}</p>
        {description ? <p className="mt-2 text-sm text-bw-text-muted">{description}</p> : null}
      </div>
    </div>
  )
}
