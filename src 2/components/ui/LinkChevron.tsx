import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Link-Text mit Pfeil-Icon statt „→“. */
export function LinkChevron({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {children}
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </span>
  )
}
