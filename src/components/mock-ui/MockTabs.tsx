'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import Link from 'next/link'
import {
  forwardRef,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '@/lib/utils'

export type MockTabItem = {
  id: string
  label: ReactNode
  /** Link-Tab (Einstellungen) — sonst Button + onChange */
  href?: string
  count?: number
  /** MockIcon-Name */
  icon?: string
  /** Fertiges Icon-Element (Lucide etc.) */
  iconNode?: ReactNode
  disabled?: boolean
  className?: string
}

export type MockTabsProps = {
  items: ReadonlyArray<MockTabItem>
  value: string
  onChange?: (id: string) => void
  'aria-label'?: string
  /** tablist-Klasse: `tabs` · `dshell-nav` · `dshell-tabs-mobile` · … */
  className?: string
  /** Basis-Klasse pro Tab: `tab` · `dshell-navitem` · … */
  tabClassName?: string
  /** Aktive Klasse — Default `active` */
  activeClassName?: string
  /** Mobile/Desktop Icon-Kontext für MockIcon */
  iconCtx?: 'nav' | 'tab' | 'default'
  showIcons?: boolean
}

/**
 * Kanonische Tabs — einzige Stelle mit `role="tab"`.
 */
export const MockTabs = forwardRef<HTMLElement, MockTabsProps>(function MockTabs(
  {
    items,
    value,
    onChange,
    'aria-label': ariaLabel,
    className = 'tabs',
    tabClassName = 'tab',
    activeClassName = 'active',
    iconCtx = 'tab',
    showIcons = true,
  },
  ref
) {
  return (
    <nav
      ref={ref as Ref<HTMLElement>}
      className={className}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const selected = value === item.id
        const cls = cn(
          tabClassName,
          selected && activeClassName,
          item.className
        )
        const inner = (
          <>
            {showIcons && item.icon ? (
              <MockIcon ctx={iconCtx} n={item.icon} size={16} />
            ) : null}
            {item.iconNode ?? null}
            <span>{item.label}</span>
            {item.count != null ? (
              <span className="tab-count dshell-count">{item.count}</span>
            ) : null}
          </>
        )

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              data-tab-id={item.id}
              role="tab"
              aria-selected={selected}
              aria-disabled={item.disabled || undefined}
              className={cls}
              tabIndex={item.disabled ? -1 : undefined}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault()
                  return
                }
                onChange?.(item.id)
              }}
            >
              {inner}
            </Link>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            data-tab-id={item.id}
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            className={cls}
            onClick={() => onChange?.(item.id)}
          >
            {inner}
          </button>
        )
      })}
    </nav>
  )
})
