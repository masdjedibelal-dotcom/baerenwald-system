'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMobileScrollChrome } from '@/hooks/useMobileScrollChrome'
import {
  resolveDetailActions,
  type DetailActionDef,
  type DetailActionSlot,
  type ResolvedDetailAction,
} from '@/lib/layout/detail-actions-layout'
import { cn } from '@/lib/utils'

export type { DetailActionDef }

/** „Angebot erstellen“ → „Erstellen“ */
export function ctaVerbLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  const verb = parts[parts.length - 1] ?? label
  if (!verb) return label
  return verb.charAt(0).toUpperCase() + verb.slice(1)
}

type Props = {
  /** Haupt-CTA — mobil floating unten */
  primary?: DetailActionDef | null
  /** Zweite Action (Bearbeiten, Rechnung erstellen, …) */
  secondary?: DetailActionDef | null
  /** Gegen-Entscheidung (z. B. Ablehnen) — danger-outline; optional, oft besser im ⋯ */
  danger?: DetailActionDef | null
  menuItems?: ActionsMenuItem[]
  sheetTitle?: string
}

function slotButtonClass(slot: DetailActionSlot, mobile = false): string {
  if (slot === 'primary') {
    return cn(
      'btn primary inline-flex items-center justify-center gap-1.5',
      mobile ? '' : 'sm'
    )
  }
  if (slot === 'danger') {
    return cn(
      'btn danger-outline inline-flex items-center justify-center gap-1.5',
      mobile ? 'detail-mobile-action-bar__danger' : 'sm'
    )
  }
  return cn(
    'btn secondary inline-flex items-center justify-center gap-1.5',
    mobile ? 'detail-mobile-action-bar__secondary' : 'sm shrink-0 gap-1.5'
  )
}

function InlineActionButton({
  item,
  size = 'sm',
  compact = false,
  className,
}: {
  item: ResolvedDetailAction
  size?: 'sm' | 'md'
  compact?: boolean
  className?: string
}) {
  const { action, slot } = item
  const displayLabel = compact
    ? (action.shortLabel?.trim() || ctaVerbLabel(action.label))
    : action.label
  const iconSize = compact ? 15 : size === 'md' ? 16 : 14

  const inner = (
    <>
      {action.icon ? <ActionIcon n={action.icon} size={iconSize} /> : null}
      <span className="detail-mobile-action-bar__label min-w-0 truncate">{displayLabel}</span>
    </>
  )

  const btnClass = cn(
    slotButtonClass(slot, Boolean(className?.includes('detail-mobile-action-bar'))),
    size === 'md' && slot === 'primary'
      ? 'h-11 px-4 text-[length:var(--fs-title)] font-semibold'
      : null,
    className
  )

  if (action.href) {
    return (
      <a href={action.href} className={btnClass} aria-label={action.label}>
        {inner}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={btnClass}
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.title}
      aria-label={action.label}
      aria-disabled={action.disabled || undefined}
    >
      {inner}
    </button>
  )
}

function MenuTrigger({
  items,
  sheetTitle,
  compact,
  className,
}: {
  items: ActionsMenuItem[]
  sheetTitle: string
  compact?: boolean
  className?: string
}) {
  return (
    <ActionsMenu
      sheetTitle={sheetTitle}
      items={items}
      trigger={
        <button
          type="button"
          className={cn(
            'qa-btn inline-flex items-center justify-center',
            compact && 'detail-top-more detail-mobile-action-bar__more',
            className
          )}
          aria-label="Weitere Aktionen"
          title="Weitere"
        >
          <ActionIcon n="dots" size={compact ? 20 : 18} />
        </button>
      }
    />
  )
}

/**
 * Desktop: Secondary · Danger · Primary · ⋯
 * Mobil: Sticky-Leiste — ≤3 CTAs sichtbar, ab 4 nur 2 + ⋯ in der Leiste.
 */
export function DetailActionsBar({
  primary,
  secondary,
  danger,
  menuItems = [],
  sheetTitle = 'Aktionen',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()
  const { scrolled } = useMobileScrollChrome(isMobile)

  const resolved = useMemo(
    () => resolveDetailActions({ primary, secondary, danger, menuItems }),
    [primary, secondary, danger, menuItems]
  )

  useEffect(() => setMounted(true), [])

  const hasStickyBar = resolved.visible.length > 0
  const hasMobileSticky = Boolean(mounted && isMobile && hasStickyBar)

  useEffect(() => {
    const root = document.body
    if (!hasMobileSticky) {
      root.classList.remove('has-detail-mobile-cta', 'detail-cta-mode')
      return
    }
    root.classList.add('has-detail-mobile-cta')
    root.classList.toggle('detail-cta-mode', scrolled)
    return () => {
      root.classList.remove('has-detail-mobile-cta', 'detail-cta-mode')
    }
  }, [hasMobileSticky, scrolled])

  const alonePrimary = resolved.layout === 'solo' && !resolved.hasMenu
  const primaryItem = resolved.visible.find((v) => v.slot === 'primary')
  const nonPrimaryVisible = resolved.visible.filter((v) => v.slot !== 'primary')

  const desktop: ReactNode = (
    <div
      className={cn(
        'detail-actions-desktop hidden items-center gap-2 md:flex',
        alonePrimary ? 'justify-center w-full' : 'justify-end w-full'
      )}
    >
      {resolved.visible.map((item) => (
        <InlineActionButton key={`${item.slot}-${item.action.label}`} item={item} />
      ))}
      {resolved.hasMenu ? (
        <MenuTrigger items={resolved.overflowMenu} sheetTitle={sheetTitle} />
      ) : null}
    </div>
  )

  const mobileBar =
    mounted && isMobile && hasStickyBar
      ? createPortal(
          <div
            className={cn(
              'detail-mobile-action-bar md:hidden',
              !scrolled && 'detail-mobile-action-bar--hidden',
              scrolled && 'detail-mobile-action-bar--nav-replaced',
              resolved.layout === 'solo' && 'detail-mobile-action-bar--solo',
              resolved.layout === 'pair' && 'detail-mobile-action-bar--pair',
              resolved.layout === 'triple' && 'detail-mobile-action-bar--triple',
              resolved.hasMenu && 'detail-mobile-action-bar--with-menu'
            )}
            role="toolbar"
            aria-label="Aktionen"
            aria-hidden={!scrolled}
          >
            <div
              className={cn(
                'detail-mobile-action-bar__inner',
                resolved.layout === 'solo' && 'detail-mobile-action-bar__inner--solo',
                resolved.layout === 'pair' && 'detail-mobile-action-bar__inner--pair',
                resolved.layout === 'triple' && 'detail-mobile-action-bar__inner--triple',
                resolved.hasMenu && 'detail-mobile-action-bar__inner--with-menu'
              )}
            >
              {nonPrimaryVisible.map((item) => (
                <InlineActionButton
                  key={`${item.slot}-${item.action.label}`}
                  item={item}
                  size="md"
                  compact={Boolean(item.action.shortLabel?.trim())}
                  className={cn(
                    item.slot === 'secondary' && 'detail-mobile-action-bar__secondary',
                    item.slot === 'danger' && 'detail-mobile-action-bar__danger'
                  )}
                />
              ))}
              {primaryItem ? (
                <InlineActionButton
                  item={primaryItem}
                  size="md"
                  compact={false}
                  className={cn(
                    'detail-mobile-action-bar__primary',
                    resolved.layout === 'solo' && 'detail-mobile-action-bar__primary--solo',
                    resolved.layout !== 'solo' && 'detail-mobile-action-bar__primary--pair'
                  )}
                />
              ) : null}
              {resolved.hasMenu ? (
                <div className="detail-mobile-action-bar__overflow">
                  <MenuTrigger
                    items={resolved.overflowMenu}
                    sheetTitle={sheetTitle}
                    compact
                  />
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
