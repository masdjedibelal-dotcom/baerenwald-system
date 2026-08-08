'use client'

import type { LucideIcon } from 'lucide-react'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { cn } from '@/lib/utils'

/** @deprecated Nutze `MockEmpty` direkt. Adapter für Lucide-Icons. */
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
    <div className={cn(className)}>
      <MockEmpty
        icon={<Icon className="h-7 w-7 text-bw-light" aria-hidden />}
        title={title}
        hint={description}
        action={action}
      />
    </div>
  )
}
