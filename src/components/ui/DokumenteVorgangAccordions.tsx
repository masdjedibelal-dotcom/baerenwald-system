'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
    <div className={cn('dok-gruppen', className)}>
      {groups.map((g, i) => (
        <DokGruppe key={g.key} titel={g.title} anzahl={g.items.length} defaultOpen={defaultOpenFirst ? i === 0 : false}>
          {renderItems(g.items)}
        </DokGruppe>
      ))}
    </div>
  )
}

/** Flache Gruppe: Titel links (abgeschnitten), Anzahl + Pfeil rechts — keine Karte in der Karte. */
function DokGruppe({
  titel,
  anzahl,
  defaultOpen,
  children,
}: {
  titel: string
  anzahl: number
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={cn('dok-gruppe', open && 'is-open')}>
      <button type="button" className="dok-gruppe__kopf" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="dok-gruppe__titel" title={titel}>{titel}</span>
        <span className="dok-gruppe__anzahl">{anzahl}</span>
        <MockIcon n="chevron-down" ctx="default" className="dok-gruppe__pfeil h-4 w-4" aria-hidden />
      </button>
      {open ? <div className="dok-gruppe__inhalt">{children}</div> : null}
    </section>
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
