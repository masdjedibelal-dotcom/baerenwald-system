'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Neutrale Kategorie-Labels (Gewerk, Kundentyp) — kein Status-Farbcode. */
export function MetaTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('meta-tag', className)}>{children}</span>
}
