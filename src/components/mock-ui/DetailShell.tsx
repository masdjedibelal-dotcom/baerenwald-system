'use client'

import { useCallback, useEffect, useId, useRef, type ReactNode, type TouchEvent } from 'react'
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

const SWIPE_MIN_DX = 56
const SWIPE_RATIO = 1.35

function touchBlockedByNestedScroll(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let node = target as HTMLElement | null
  while (node && node !== boundary) {
    if (node.classList?.contains('swiperow')) return true
    const ox = getComputedStyle(node).overflowX
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 8) {
      return true
    }
    node = node.parentElement
  }
  return false
}

/**
 * Spec §4: Desktop Nav links · Mobil horizontale Tabs (sticky) + Swipe zwischen Tabs.
 * Unbekannter `value` → erster Tab (kein leerer Bereich).
 */
export function DetailShell({ groups, value, onChange, className }: DetailShellProps) {
  const isMobile = useIsMobile()
  const active = groups.find((g) => g.id === value) ?? groups[0]
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement>(null)
  const swipeRef = useRef<{ x: number; y: number; blocked: boolean } | null>(null)

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

  const goRelative = useCallback(
    (dir: -1 | 1) => {
      if (!groups.length || !active) return
      const idx = groups.findIndex((g) => g.id === active.id)
      if (idx < 0) return
      const next = groups[idx + dir]
      if (next) onChange(next.id)
    },
    [active, groups, onChange]
  )

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isMobile) return
      const t = e.touches[0]
      if (!t) return
      const blocked = touchBlockedByNestedScroll(e.target, bodyRef.current)
      swipeRef.current = { x: t.clientX, y: t.clientY, blocked }
    },
    [isMobile]
  )

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isMobile) return
      const start = swipeRef.current
      swipeRef.current = null
      if (!start || start.blocked) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) < SWIPE_MIN_DX) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
      // Swipe links → nächster Tab · rechts → vorheriger
      goRelative(dx < 0 ? 1 : -1)
    },
    [goRelative, isMobile]
  )

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
      <div
        className="dshell-body"
        ref={bodyRef}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        onTouchCancel={isMobile ? () => { swipeRef.current = null } : undefined}
      >
        <div className="dshell-group active">
          <div className="dshell-cards">{active ? active.render() : null}</div>
        </div>
      </div>
    </div>
  )
}
