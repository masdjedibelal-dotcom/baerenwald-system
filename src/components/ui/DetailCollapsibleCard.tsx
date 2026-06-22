'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DetailCollapsibleCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  bodyClassName?: string
  flush?: boolean
}

/** Detail-Ansicht: klappbare Card mit hellgrünem Kopf, Klick auf Kopfzeile toggelt. */
export function DetailCollapsibleCard({
  title,
  action,
  children,
  defaultOpen = true,
  className,
  bodyClassName,
  flush = false,
  ...props
}: DetailCollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('detail-section-card', className)} {...props}>
      <div className="detail-section-card__header">
        <button
          type="button"
          className="detail-section-card__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="detail-section-card__title">{title}</span>
          <ChevronDown
            className={cn('detail-section-card__chevron', open && 'is-open')}
            aria-hidden
          />
        </button>
        {action ? (
          <div
            className="detail-section-card__action"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {action}
          </div>
        ) : null}
      </div>
      {open ? (
        <div className="detail-section-card__body">
          {flush ? (
            <div className={cn(bodyClassName)}>{children}</div>
          ) : (
            <div className={cn('detail-section-card__body-inner', bodyClassName)}>{children}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
