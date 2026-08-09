'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Einheitliches Werkzeug-Layout (UX2-4):
 * Titel + Zweck · Primärinhalt · optional „Erweitert“ eingeklappt · Aktionen.
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
    <div className={cn('card', framed && 'dshell-framed', 'werkzeug-panel', className)}>
      <div className="card-h">
        <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon ? <MockIcon ctx="default" n={icon} size={15} /> : null}
          {title}
        </div>
        {actions ? <div className="werkzeug-panel__actions">{actions}</div> : null}
      </div>
      <div className="card-b">
        {purpose ? <p className="werkzeug-panel__purpose">{purpose}</p> : null}
        <div className="werkzeug-panel__body">{children}</div>
        {advanced ? (
          <div className="werkzeug-panel__advanced">
            <button
              type="button"
              className="werkzeug-panel__advanced-toggle"
              aria-expanded={advOpen}
              onClick={() => setAdvOpen((v) => !v)}
            >
              <span>{advancedTitle}</span>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', advOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {advOpen ? <div className="werkzeug-panel__advanced-body">{advanced}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
