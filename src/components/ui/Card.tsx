import { MockCard } from '@/components/mock-ui/MockCard'
import type { HTMLAttributes, ReactNode } from 'react'
interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  icon?: string
  action?: ReactNode
  children: ReactNode
  /** Nur bei explizit `true`: Klick auf Kopfzeile klappt ein/aus. */
  collapsible?: boolean
  defaultOpen?: boolean
  /** Zusätzliche Klassen für `card-b` (z. B. `p-0` für volle Breite). */
  bodyClassName?: string
  /** Ohne inneres Padding (nur Rahmen), z. B. für Tabellen/List-Shells. */
  flush?: boolean
}

export function Card({
  title,
  icon,
  action,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
  bodyClassName,
  flush = false,
  ...props
}: CardProps) {
  return (
    <MockCard
      title={title}
      icon={icon}
      actions={action}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      bodyClassName={bodyClassName}
      flush={flush}
      className={className}
      {...props}
    >
      {children}
    </MockCard>
  )
}
