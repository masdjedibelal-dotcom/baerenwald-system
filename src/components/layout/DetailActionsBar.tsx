'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMobileScrollChrome } from '@/hooks/useMobileScrollChrome'
import { cn } from '@/lib/utils'

export type DetailActionDef = {
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  /** Link statt Button (Desktop + Mobil) */
  href?: string
}

type Props = {
  /** Haupt-CTA — mobil zentriert wenn allein, sonst ~¾ Breite mit Overflow */
  primary?: DetailActionDef | null
  /**
   * Zweite Action: Desktop als eigener Button,
   * mobil wandert sie ins ⋯-Menü (nur falls Menü existiert).
   */
  secondary?: DetailActionDef | null
  menuItems?: ActionsMenuItem[]
  sheetTitle?: string
}

function ActionControl({
  action,
  className,
  size = 'sm',
}: {
  action: DetailActionDef
  className?: string
  size?: 'sm' | 'md'
}) {
  const inner = (
    <>
      {action.icon ? <MockIcon ctx="btn" n={action.icon} size={size === 'md' ? 16 : 14} /> : null}
      <span className="min-w-0 truncate">{action.label}</span>
    </>
  )

  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(
          'btn primary inline-flex items-center justify-center gap-1.5',
          size === 'md' ? 'h-11 px-4 text-[length:var(--fs-title)]' : 'sm',
          className
        )}
      >
        {inner}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'btn primary inline-flex items-center justify-center gap-1.5',
        size === 'md' ? 'h-11 px-4 text-[length:var(--fs-title)] font-semibold' : 'sm',
        className
      )}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
    >
      {inner}
    </button>
  )
}

function withoutPrimaryDuplicate(
  items: ActionsMenuItem[],
  primaryLabel?: string | null
): ActionsMenuItem[] {
  const p = primaryLabel?.trim().toLowerCase()
  if (!p) return items
  return items.filter((it) => {
    if (it === 'sep') return true
    return it.label.trim().toLowerCase() !== p
  })
}

function hasMenuContent(items: ActionsMenuItem[]): boolean {
  return items.some((it) => it !== 'sep')
}

/**
 * Desktop: Primary (+ optional Secondary / ⋯ nur wenn Items).
 * Mobil: Sticky-Bar — Primary zentriert wenn allein; mit Menü Primär + ⋯.
 */
export function DetailActionsBar({
  primary,
  secondary,
  menuItems = [],
  sheetTitle = 'Aktionen',
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isMobile = useIsMobile()
  const { hideChrome } = useMobileScrollChrome(isMobile)

  const cleanMenuItems = useMemo(
    () => withoutPrimaryDuplicate(menuItems, primary?.label),
    [menuItems, primary?.label]
  )

  const mobileMenuItems = useMemo((): ActionsMenuItem[] => {
    if (!secondary) return cleanMenuItems
    const item: ActionsMenuItem = {
      label: secondary.label,
      icon: secondary.icon ? (
        <MockIcon ctx="btn" n={secondary.icon} size={16} />
      ) : undefined,
      onClick: secondary.onClick,
    }
    if (!cleanMenuItems.length) return [item]
    return [item, 'sep', ...cleanMenuItems]
  }, [secondary, cleanMenuItems])

  const showOverflow = hasMenuContent(mobileMenuItems)
  const alonePrimary = Boolean(primary) && !showOverflow && !secondary

  const menuTrigger = (compact: boolean, items: ActionsMenuItem[]) => (
    <ActionsMenu
      sheetTitle={sheetTitle}
      items={items}
      trigger={
        <button
          type="button"
          className={cn(
            'qa-btn inline-flex items-center justify-center',
            compact && 'detail-mobile-action-bar__more'
          )}
          aria-label="Weitere Aktionen"
          title="Aktionen"
        >
          <MockIcon ctx="btn" n="dots" size={compact ? 20 : 18} />
        </button>
      }
    />
  )

  const desktop: ReactNode = (
    <div
      className={cn(
        'detail-actions-desktop hidden items-center gap-2 md:flex',
        alonePrimary ? 'justify-center w-full' : 'justify-end'
      )}
    >
      {secondary ? (
        <button
          type="button"
          className="btn ghost sm inline-flex shrink-0 gap-1.5"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          aria-label={secondary.label}
        >
          {secondary.icon ? <MockIcon ctx="btn" n={secondary.icon} size={14} /> : null}
          {secondary.label}
        </button>
      ) : null}
      {primary ? <ActionControl action={primary} /> : null}
      {showOverflow ? menuTrigger(false, cleanMenuItems) : null}
    </div>
  )

  const mobileBar =
    mounted && (primary || showOverflow)
      ? createPortal(
          <div
            className={cn(
              'detail-mobile-action-bar md:hidden',
              hideChrome && 'detail-mobile-action-bar--hidden',
              alonePrimary && 'detail-mobile-action-bar--solo'
            )}
            role="toolbar"
            aria-label="Aktionen"
          >
            <div
              className={cn(
                'detail-mobile-action-bar__inner',
                alonePrimary && 'detail-mobile-action-bar__inner--solo'
              )}
            >
              {primary ? (
                <ActionControl
                  action={primary}
                  size="md"
                  className={cn(
                    'detail-mobile-action-bar__primary',
                    alonePrimary && 'detail-mobile-action-bar__primary--solo'
                  )}
                />
              ) : showOverflow ? (
                <div className="detail-mobile-action-bar__primary detail-mobile-action-bar__primary--empty" />
              ) : null}
              {showOverflow ? (
                <div className="detail-mobile-action-bar__overflow">
                  {menuTrigger(true, mobileMenuItems)}
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      {desktop}
      {mobileBar}
    </>
  )
}
