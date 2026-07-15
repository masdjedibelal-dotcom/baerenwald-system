'use client'

import { useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export type MockDetailShellGroup = {
  id: string
  label: string
  icon: string
  count?: number
  render: () => ReactNode
}

export function MockDetailShell({
  groups,
  defaultGroup,
  activeGroup,
  onActiveGroupChange,
}: {
  groups: MockDetailShellGroup[]
  defaultGroup?: string
  activeGroup?: string
  onActiveGroupChange?: (id: string) => void
}) {
  const [internalActive, setInternalActive] = useState(defaultGroup ?? groups[0]?.id ?? '')
  const active = activeGroup ?? internalActive
  const setActive = (id: string) => {
    onActiveGroupChange?.(id)
    if (activeGroup == null) setInternalActive(id)
  }

  return (
    <div className="dshell">
      <nav className="dshell-nav" aria-label="Detailbereiche">
        {groups.map((gr) => (
          <button
            key={gr.id}
            type="button"
            className={`dshell-navitem${active === gr.id ? ' active' : ''}`}
            onClick={() => setActive(gr.id)}
          >
            <MockIcon n={gr.icon} size={16} />
            <span>{gr.label}</span>
            {gr.count != null ? <span className="dshell-count">{gr.count}</span> : null}
          </button>
        ))}
      </nav>
      <div className="dshell-body">
        {groups.map((gr) => (
          <div key={gr.id} className={`dshell-group${active === gr.id ? ' active' : ''}`}>
            <div className="dshell-group-h">
              <MockIcon n={gr.icon} size={15} />
              {gr.label}
            </div>
            <div className="dshell-cards">{gr.render()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
