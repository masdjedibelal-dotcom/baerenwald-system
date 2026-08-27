'use client'

import type { ReactNode } from 'react'
import { MockInfoTip } from '@/components/mock-ui/MockInfoTip'
import { fachbegriff, type FachbegriffKey } from '@/lib/crm/fachbegriffe'
import { cn } from '@/lib/utils'

/**
 * Inline-Label mit MockInfoTip aus dem Fachbegriff-Glossar.
 * Für Chips, Badges und kurze Labels.
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
    <Comp className={cn('inline-flex items-center gap-1', className)}>
      {children}
      <MockInfoTip tip={fachbegriff(term)} label={`Hinweis zu ${term}`} />
    </Comp>
  )
}
