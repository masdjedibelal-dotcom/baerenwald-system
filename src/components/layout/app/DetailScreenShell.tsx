'use client'

import type { ReactNode } from 'react'
import { AppDetailScreen } from '@/components/layout/app/AppDetailScreen'

type DetailScreenShellProps = {
  tabs?: ReactNode
  children: ReactNode
  className?: string
}

/** Einheitlicher Wrapper für Detail-Ansichten mit optionaler Tab-Leiste. */
export function DetailScreenShell({ tabs, children, className }: DetailScreenShellProps) {
  return (
    <AppDetailScreen tabs={tabs} className={className}>
      {children}
    </AppDetailScreen>
  )
}
