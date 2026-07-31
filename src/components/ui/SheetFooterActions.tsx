'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Einheitlicher Sheet-/Modal-Footer-Wrapper.
 * Negativ/Secondary links · Positiv/Primary rechts; allein zentriert (~halbe Breite mobil).
 */
export function SheetFooterActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('sheet-footer-actions', className)}>{children}</div>
}
