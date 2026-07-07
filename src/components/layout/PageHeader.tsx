import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PageHeaderCrumb = { label: string; href?: string }

/**
 * Optionale Page-Meta unterhalb der TopBar.
 * Der Seitentitel kommt grundsätzlich aus der TopBar (siehe Sidebar/TopBar) und
 * wird hier NICHT mehr dupliziert.
 *
 * Slots:
 *  - description: kurze Erläuterung
 *  - action:      ein/mehrere Buttons rechts (mobil horizontal scrollbar)
 *  - tabs:        Tab-Bar unterhalb von description/action
 */
export function PageHeader({
  action,
  tabs,
  description,
  className,
}: {
  action?: ReactNode
  tabs?: ReactNode
  description?: ReactNode
  className?: string
}) {
  const hasTopRow = !!description || !!action
  if (!hasTopRow && !tabs) return null

  return (
    <div className={cn('mb-3 md:mb-4', className)}>
      {hasTopRow ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            description ? 'justify-between' : 'justify-end'
          )}
        >
          {description ? (
            <div className="min-w-0">
              <p className="text-sm text-bw-text-muted">{description}</p>
            </div>
          ) : null}
          {action ? (
            <div className="-mx-1 flex flex-shrink-0 items-center gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}

      {tabs ? <div className={cn(hasTopRow && 'mt-3')}>{tabs}</div> : null}
    </div>
  )
}
