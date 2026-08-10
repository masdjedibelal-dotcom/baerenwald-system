'use client'

import type { ReactNode } from 'react'
import { Accordion } from '@/components/ui/Accordion'
import { cn } from '@/lib/utils'

export type DokumentVorgangGruppe<T> = {
  key: string
  title: string
  items: T[]
}

/** Dokumente in der Akte nach Vorgangstitel in Accordions. */
export function DokumenteVorgangAccordions<T>({
  groups,
  renderItems,
  className,
  defaultOpenFirst = true,
}: {
  groups: DokumentVorgangGruppe<T>[]
  renderItems: (items: T[]) => ReactNode
  className?: string
  defaultOpenFirst?: boolean
}) {
  if (groups.length === 0) return null

  return (
    <div className={cn('dok-vorgang-groups space-y-2', className)}>
      {groups.map((g, i) => (
        <Accordion
          key={g.key}
          className="dok-vorgang-accordion"
          defaultOpen={defaultOpenFirst ? i === 0 : false}
          title={`${g.title} (${g.items.length})`}
        >
          {renderItems(g.items)}
        </Accordion>
      ))}
    </div>
  )
}

export function groupByVorgangTitel<T extends { groupKey: string; groupTitle: string }>(
  items: T[]
): DokumentVorgangGruppe<T>[] {
  const map = new Map<string, DokumentVorgangGruppe<T>>()
  for (const item of items) {
    const key = item.groupKey || 'allgemein'
    const title = item.groupTitle?.trim() || 'Allgemein'
    const existing = map.get(key)
    if (existing) {
      existing.items.push(item)
      if (title && title !== 'Allgemein' && existing.title === 'Allgemein') {
        existing.title = title
      }
    } else {
      map.set(key, { key, title, items: [item] })
    }
  }
  const groups = Array.from(map.values())
  groups.sort((a, b) => {
    if (a.key === 'allgemein') return 1
    if (b.key === 'allgemein') return -1
    return a.title.localeCompare(b.title, 'de')
  })
  return groups
}
