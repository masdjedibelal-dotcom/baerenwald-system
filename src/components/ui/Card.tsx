import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DetailCollapsibleCard } from '@/components/ui/DetailCollapsibleCard'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Detail-Ansicht: hellgrüner Kopf, Klick auf Kopfzeile klappt ein/aus. Standard: an, wenn `title` gesetzt ist. */
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
  collapsible: collapsibleProp,
  defaultOpen = true,
  bodyClassName,
  flush = false,
  ...props
}: CardProps) {
  const collapsible =
    collapsibleProp ?? (title != null && title !== '')

  if (collapsible && title != null && title !== '') {
    return (
      <DetailCollapsibleCard
        title={title}
        action={action}
        defaultOpen={defaultOpen}
        className={className}
        flush={flush}
        bodyClassName={bodyClassName}
        {...props}
      >
        {children}
      </DetailCollapsibleCard>
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
