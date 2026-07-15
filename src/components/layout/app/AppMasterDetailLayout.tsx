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
  /** Unterseiten (Wizard, Neu) ohne Listen-Wrapper */
  fullBleed?: boolean
}) {
  const pathname = usePathname()
  const isListRoot = pathname === basePath
  const hasSelection = Boolean(selectedId)

  if (fullBleed) {
    return <div className="min-w-0">{children}</div>
  }

  /** Mock-Optik: volle Listenbreite — keine Split-Ansicht mit Karten-Spalte. */
  if (isListRoot && !hasSelection) {
    return (
      <div data-app-list-page="" className={cn('app-list-page min-w-0')}>
        {list}
      </div>
    )
  }

  /** Detail: volle Breite, Navigation über TopBar/Breadcrumb. */
  return (
    <div
      data-app-detail-page=""
      data-selected-id={selectedId ?? undefined}
      className={cn('app-detail-page min-w-0')}
    >
      {children}
    </div>
  )
}

/** @deprecated Mock nutzt keine Split-Placeholder mehr. */
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
