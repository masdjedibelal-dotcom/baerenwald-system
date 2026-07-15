'use client'

import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

type MockCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: ReactNode
  icon?: string
  actions?: ReactNode
  children: ReactNode
  bodyClassName?: string
  flush?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
}

export function MockCard({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  flush,
  collapsible,
  defaultOpen = true,
  ...props
}: MockCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const showHeader = Boolean(title || actions)
  const body = (
    <div className={cn('card-b', flush && 'p-0', bodyClassName)}>{children}</div>
  )

  if (collapsible && title) {
    return (
      <div className={cn('card', className)} {...props}>
        <div className="card-h">
          <button
            type="button"
            className="card-title flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {icon ? <MockIcon n={icon} size={16} /> : null}
            <span className="min-w-0 flex-1">{title}</span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </button>
          {actions}
        </div>
        {open ? body : null}
      </div>
    )
  }

  return (
    <div className={cn('card', className)} {...props}>
      {showHeader ? (
        <div className="card-h">
          {title ? (
            <div className="card-title">
              {icon ? <MockIcon n={icon} size={16} /> : null}
              {title}
            </div>
          ) : (
            <div />
          )}
          {actions}
        </div>
      ) : null}
      {body}
    </div>
  )
}

export function MockCardArrowAction({ onClick }: { onClick: () => void }) {
  return <MockBtn sm kind="ghost" icon="arrow-right" onClick={onClick} />
}
