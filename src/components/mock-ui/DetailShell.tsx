'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { cn } from '@/lib/utils'

export type DetailShellGroup = {
  id: string
  label: string
  icon: MockIconName | string
  count?: number
  render: () => ReactNode
}

export type DetailShellProps = {
  groups: DetailShellGroup[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/**
 * Mock-DetailShell: linke Section-Nav (210px) + Inhalt.
 * Mobil: horizontale Pill-Tabs (CSS). Nur aktive Gruppe wird gerendert.
 */
export function DetailShell({ groups, value, onChange, className }: DetailShellProps) {
  const active = groups.find((g) => g.id === value) ?? groups[0]

  return (
    <div className={cn('dshell', className)}>
      <nav className="dshell-nav" aria-label="Auftragsbereiche">
        {groups.map((gr) => {
          const isActive = (active?.id ?? value) === gr.id
          return (
            <button
              key={gr.id}
              type="button"
              className={cn('dshell-navitem', isActive && 'active')}
              onClick={() => onChange(gr.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <MockIcon n={gr.icon} size={16} />
              <span>{gr.label}</span>
              {gr.count != null ? <span className="dshell-count">{gr.count}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className="dshell-body">
        <div className="dshell-group active">
          <div className="dshell-cards">{active ? active.render() : null}</div>
        </div>
      </div>
    </div>
  )
}
