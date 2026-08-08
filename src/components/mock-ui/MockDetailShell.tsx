'use client'

import { useState, type ReactNode } from 'react'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'

export type MockDetailShellGroup = {
  id: string
  label: string
  icon: string
  count?: number
  render: () => ReactNode
}

/**
 * Uncontrolled Convenience-API um die kanonische `DetailShell`.
 * Neue Screens: bevorzugt `DetailShell` mit value/onChange.
 */
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
  const value = activeGroup ?? internalActive

  const shellGroups: DetailShellGroup[] = groups.map((g) => ({
    id: g.id,
    label: g.label,
    icon: g.icon,
    count: g.count,
    render: g.render,
  }))

  return (
    <DetailShell
      groups={shellGroups}
      value={value}
      onChange={(id) => {
        onActiveGroupChange?.(id)
        if (activeGroup == null) setInternalActive(id)
      }}
    />
  )
}
