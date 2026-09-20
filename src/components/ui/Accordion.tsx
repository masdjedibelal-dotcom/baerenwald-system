'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AccordionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  action?: ReactNode
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = '',
  action,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('accordion', className)}>
      <MockBtn fullWidth className="accordion-header text-left" type="button" onClick={() => setOpen(!open)}>
        <span className="accordion-title">{title}</span>
        <div className="flex items-center gap-2">
          {action ? (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {action}
            </div>
          ) : null}
          <MockIcon n="chevron-down" ctx="default" className={cn('accordion-icon h-4 w-4', open && 'open')} aria-hidden />
        </div>
      </MockBtn>
      {open ? <div className="accordion-body animate-fade-in">{children}</div> : null}
    </div>
  )
}
