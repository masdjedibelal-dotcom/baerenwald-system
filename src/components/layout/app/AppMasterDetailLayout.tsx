'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Listen ohne Split-Screen: Vollbreite-Liste oder Vollbreite-Detail.
 * (Master-Detail-Split entfernt — Zeilenklick navigiert zur Detail-Route.)
 */
export function AppMasterDetailLayout({
  basePath,
  list,
  children,
  fullBleed = false,
}: {
  basePath: string
  list: ReactNode
  children: ReactNode
  fullBleed?: boolean
}) {
  const pathname = usePathname()
  const isListRoot = pathname === basePath

  if (fullBleed) {
    return <div className="min-w-0">{children}</div>
  }

  if (isListRoot) {
    return <div className="min-w-0">{list}</div>
  }

  return <div className="min-w-0">{children}</div>
}
