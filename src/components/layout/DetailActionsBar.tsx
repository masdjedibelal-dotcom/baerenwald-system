'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
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
  /** Haupt-CTA — mobil ~¾ Breite */
  primary?: DetailActionDef | null
  /**
   * Zweite Action: Desktop als eigener Button,
   * mobil wandert sie ins ⋯-Menü (nicht als zweiter großer CTA).
   */
  secondary?: DetailActionDef | null
  menuItems: ActionsMenuItem[]
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
          size === 'md' ? 'h-11 px-4 text-[15px]' : 'sm',
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
        size === 'md' ? 'h-11 px-4 text-[15px] font-semibold' : 'sm',
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

/**
 * Desktop: Actions im Detail-Kopf.
 * Mobil: Sticky-Bar über Bottom-Nav — Primär ~¾, ⋯ ~¼.
 * Zweite Action (secondary) nur Desktop als Button, mobil im Menü.
 */
export function DetailActionsBar({
  primary,
  secondary,
  menuItems,
  sheetTitle = 'Aktionen',
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mobileMenuItems = useMemo((): ActionsMenuItem[] => {
    if (!secondary) return menuItems
    const item: ActionsMenuItem = {
      label: secondary.label,
      icon: secondary.icon ? (
        <MockIcon ctx="btn" n={secondary.icon} size={16} />
      ) : undefined,
      onClick: secondary.onClick,
    }
    if (!menuItems.length) return [item]
    return [item, 'sep', ...menuItems]
  }, [secondary, menuItems])

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
    <div className="detail-actions-desktop hidden items-center justify-end gap-2 md:flex">
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
      {menuTrigger(false, menuItems)}
    </div>
  )

  const mobileBar =
    mounted && (primary || mobileMenuItems.length > 0)
      ? createPortal(
          <div className="detail-mobile-action-bar md:hidden" role="toolbar" aria-label="Aktionen">
            <div className="detail-mobile-action-bar__inner">
              {primary ? (
                <ActionControl action={primary} size="md" className="detail-mobile-action-bar__primary" />
              ) : (
                <div className="detail-mobile-action-bar__primary detail-mobile-action-bar__primary--empty" />
              )}
              <div className="detail-mobile-action-bar__overflow">{menuTrigger(true, mobileMenuItems)}</div>
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
