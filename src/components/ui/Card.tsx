import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Accordion } from '@/components/ui/Accordion'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

export function Card({
  title,
  action,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
  ...props
}: CardProps) {
  if (collapsible && typeof title === 'string' && title !== '') {
    return (
      <Accordion title={title} defaultOpen={defaultOpen} className={className} action={action}>
        {children}
      </Accordion>
    )
  }

  if (title != null && title !== '') {
    return (
      <div className={cn('card', className)} {...props}>
        <div className="card-header">
          <span className="card-title">{title}</span>
          {action ? <div>{action}</div> : null}
        </div>
        <div className="card-body">{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('card', className)} {...props}>
      <div className="p-5">{children}</div>
    </div>
  )
}
