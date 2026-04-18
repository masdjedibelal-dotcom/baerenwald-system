import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 mb-4 flex min-h-[52px] items-center justify-between gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8',
        className
      )}
    >
      {typeof title === 'string' ? (
        <h1 className="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
      ) : (
        <div className="min-w-0 flex-1 text-xl font-semibold text-ink md:text-2xl">{title}</div>
      )}
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </header>
  )
}
