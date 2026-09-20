'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Einheitliches Werkzeug-Layout (UX2-4):
 * Titel + Zweck · Primärinhalt · optional „Erweitert“ eingeklappt · Aktionen.
 * Rahmen über MockCard.
 */
export function WerkzeugPanel({
  title,
  icon,
  purpose,
  actions,
  children,
  advanced,
  advancedTitle = 'Erweitert',
  defaultAdvancedOpen = false,
  className,
  framed,
}: {
  title: string
  icon?: string
  /** Ein Satz: wozu das Werkzeug dient */
  purpose?: string
  actions?: ReactNode
  children: ReactNode
  /** Sekundäre Optionen — standardmäßig eingeklappt */
  advanced?: ReactNode
  advancedTitle?: string
  defaultAdvancedOpen?: boolean
  className?: string
  /** Rahmen behalten (Listen/Tabellen) */
  framed?: boolean
}) {
  const [advOpen, setAdvOpen] = useState(defaultAdvancedOpen)

  return (
    <MockCard
      title={title}
      icon={icon}
      actions={actions ? <div className="werkzeug-panel__actions">{actions}</div> : undefined}
      className={cn(framed && 'dshell-framed', 'werkzeug-panel', className)}
    >
      {purpose ? <p className="werkzeug-panel__purpose">{purpose}</p> : null}
      <div className="werkzeug-panel__body">{children}</div>
      {advanced ? (
        <div className="werkzeug-panel__advanced">
          <MockBtn
            className="werkzeug-panel__advanced-toggle"
            type="button"
            aria-expanded={advOpen}
            onClick={() => setAdvOpen((v) => !v)}
          >
            <span>{advancedTitle}</span>
            <MockIcon
              n="chevron-down"
              ctx="default"
              className={cn('h-4 w-4 transition-transform', advOpen && 'rotate-180')}
              aria-hidden
            />
          </MockBtn>
          {advOpen ? <div className="werkzeug-panel__advanced-body">{advanced}</div> : null}
        </div>
      ) : null}
    </MockCard>
  )
}
