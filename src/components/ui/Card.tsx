import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Accordion } from '@/components/ui/Accordion'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  /** Zusätzliche Klassen für `card-body` (z. B. `p-0` für volle Breite). */
  bodyClassName?: string
  /** Ohne inneres Padding (nur Rahmen), z. B. für Tabellen/List-Shells. */
  flush?: boolean
}

export function Card({
  title,
  action,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
  bodyClassName,
  flush = false,
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
        <div className={cn('card-body', bodyClassName)}>{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('card', className)} {...props}>
      {flush ? <>{children}</> : <div className={cn('p-5', bodyClassName)}>{children}</div>}
    </div>
  )
}
