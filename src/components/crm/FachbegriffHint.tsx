'use client'

import type { ReactNode } from 'react'
import { fachbegriff, type FachbegriffKey } from '@/lib/crm/fachbegriffe'
import { cn } from '@/lib/utils'

/**
 * Inline-Label mit nativem Tooltip (title) aus dem Fachbegriff-Glossar.
 * Für Chips, Badges und kurze Labels — kein Overlay-Modal.
 */
export function FachbegriffHint({
  term,
  children,
  className,
  as: Comp = 'span',
}: {
  term: FachbegriffKey
  children: ReactNode
  className?: string
  as?: 'span' | 'div'
}) {
  return (
    <Comp className={cn(className)} title={fachbegriff(term)}>
      {children}
    </Comp>
  )
}
