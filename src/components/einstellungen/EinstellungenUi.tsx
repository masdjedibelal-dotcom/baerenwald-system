import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TITLE_CLASS = 'm-0 text-[length:var(--fs-text)] font-semibold text-[var(--text)]'

/**
 * Einheitliche Bereichsüberschrift in Einstellungen
 * (wie „Teammitglieder“: fs-text, semibold).
 */
export function EinstellungenSectionHeading({
  children,
  className,
  actions,
}: {
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  if (actions != null) {
    return (
      <div className={cn('mb-3.5 flex items-center justify-between gap-3', className)}>
        <h2 className={TITLE_CLASS}>{children}</h2>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    )
  }
  return <h2 className={cn(TITLE_CLASS, className)}>{children}</h2>
}
