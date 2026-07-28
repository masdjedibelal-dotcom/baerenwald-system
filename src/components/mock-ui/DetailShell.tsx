'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { useIsMobile } from '@/hooks/useIsMobile'
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
 * Spec §4: Desktop Nav links · Mobil horizontale Unterstrich-Tabs (alle sichtbar, sticky).
 * Unbekannter `value` → erster Tab (kein leerer Bereich).
 */
export function DetailShell({ groups, value, onChange, className }: DetailShellProps) {
  const isMobile = useIsMobile()
  const active = groups.find((g) => g.id === value) ?? groups[0]
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = 0
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [value])

  useEffect(() => {
    if (!isMobile || !tabsRef.current || !active) return
    const btn = tabsRef.current.querySelector<HTMLElement>(`[data-tab-id="${active.id}"]`)
    btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [active, isMobile])

  if (!groups.length) {
    return (
      <div className={cn('dshell', className)}>
        <div className="dshell-body p-4 text-[length:var(--fs-text)] text-bw-text-muted">Kein Bereich verfügbar.</div>
      </div>
    )
  }

  return (
    <div className={cn('dshell', isMobile && 'dshell--tabs-mobile', className)}>
      <nav
        ref={tabsRef}
        className={cn(isMobile ? 'dshell-tabs-mobile' : 'dshell-nav')}
        aria-label="Bereiche"
        role="tablist"
        id={titleId}
      >
        {groups.map((gr) => {
          const isActive = (active?.id ?? value) === gr.id
          return (
            <button
              key={gr.id}
              type="button"
              role="tab"
              data-tab-id={gr.id}
              className={cn(
                isMobile ? 'dshell-tab-mobile' : 'dshell-navitem',
                isActive && 'active'
              )}
              onClick={() => onChange(gr.id)}
              aria-selected={isActive}
            >
              {!isMobile ? <MockIcon ctx="nav" n={gr.icon} size={16} /> : null}
              <span>{gr.label}</span>
              {!isMobile && gr.count != null ? (
                <span className="dshell-count">{gr.count}</span>
              ) : null}
            </button>
          )
        })}
      </nav>
      <div className="dshell-body" ref={bodyRef}>
        <div className="dshell-group active">
          <div className="dshell-cards">{active ? active.render() : null}</div>
        </div>
      </div>
    </div>
  )
}
