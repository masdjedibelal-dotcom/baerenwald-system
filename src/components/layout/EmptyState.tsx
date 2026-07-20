import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'empty-state flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-bw-border bg-bw-card px-6 py-10 text-center',
        className
      )}
    >
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-bw-hover">
        <Icon className="h-7 w-7 text-bw-light" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="empty-state-title text-base font-semibold text-bw-text">{title}</p>
        {description ? (
          <p className="empty-state-text max-w-sm text-sm text-bw-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
