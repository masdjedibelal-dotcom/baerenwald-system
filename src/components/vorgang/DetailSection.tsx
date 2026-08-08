'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Flache Sektion ohne Card-Stack (Spec §1.3).
 */
export function DetailSection({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string
  count?: number | string | null
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('detail-section', className)}>
      <header className="detail-section__head">
        <h3 className="text-[length:var(--fs-head)] detail-section__title">{title}</h3>
        {count != null && count !== '' ? (
          <span className="text-[length:var(--fs-meta)] detail-section__count">{count}</span>
        ) : null}
        {action ? <div className="detail-section__action">{action}</div> : null}
      </header>
      {children ? <div className="detail-section__body">{children}</div> : null}
    </section>
  )
}
