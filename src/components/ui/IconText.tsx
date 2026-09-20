/** Text mit MockIcon davor (keine Emojis, kein Lucide). */
import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { cn } from '@/lib/utils'

export function IconText({
  icon,
  children,
  className,
  iconClassName,
  ctx = 'default',
}: {
  icon: MockIconName | string
  children: ReactNode
  className?: string
  iconClassName?: string
  ctx?: 'default' | 'row' | 'btn' | 'emphasis' | 'empty' | 'nav' | 'tab' | 'sidebar'
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <MockIcon n={icon} ctx={ctx} size={14} className={cn('shrink-0', iconClassName)} />
      <span>{children}</span>
    </span>
  )
}
