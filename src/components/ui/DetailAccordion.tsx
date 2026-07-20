'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DetailAccordionSection = {
  id: string
  title: ReactNode
  content: ReactNode
  defaultOpen?: boolean
}

/** Mobil: ein Block offen, Rest zugeklappt (App-Settings-Stil). */
export function DetailAccordion({
  sections,
  className,
  mobileOnly = false,
}: {
  sections: DetailAccordionSection[]
  className?: string
  /** Auf Desktop normale Card-Abstände, auf Mobil Accordion */
  mobileOnly?: boolean
}) {
  const defaultId = sections.find((s) => s.defaultOpen)?.id ?? sections[0]?.id ?? ''
  const [openId, setOpenId] = useState(defaultId)

  const accordion = (
    <div className={cn('app-accordion space-y-2', className, mobileOnly && 'md:hidden')}>
      {sections.map((section) => {
        const open = openId === section.id
        return (
          <div key={section.id} className={cn('app-accordion-item', open && 'app-accordion-item--open')}>
            <button
              type="button"
              className="app-accordion-trigger"
              aria-expanded={open}
              onClick={() => setOpenId(open ? '' : section.id)}
            >
              <span className="min-w-0 truncate text-[14px] font-semibold text-bw-text">{section.title}</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-bw-text-muted transition-transform', open && 'rotate-180')}
                aria-hidden
              />
            </button>
            {open ? <div className="app-accordion-panel">{section.content}</div> : null}
          </div>
        )
      })}
    </div>
  )

  if (!mobileOnly) return accordion

  return (
    <>
      {accordion}
      <div className="hidden space-y-3 md:block">
        {sections.map((section) => (
          <div
            key={section.id}
            className="overflow-hidden rounded-xl border border-[var(--app-separator)] bg-[var(--app-card)] shadow-sm"
          >
            <div className="border-b border-[var(--app-separator)] px-4 py-3 text-[14px] font-semibold text-bw-text">
              {section.title}
            </div>
            <div className="px-4 py-3">{section.content}</div>
          </div>
        ))}
      </div>
    </>
  )
}
