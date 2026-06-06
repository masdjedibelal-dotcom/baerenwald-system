import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Text mit Lucide-Icon davor (keine Emojis). */
export function IconText({
  icon: Icon,
  children,
  className,
  iconClassName,
}: {
  icon: LucideIcon
  children: ReactNode
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconClassName)} aria-hidden />
      <span>{children}</span>
    </span>
  )
}
