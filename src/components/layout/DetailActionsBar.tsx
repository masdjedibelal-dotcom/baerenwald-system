'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { ActionIcon } from '@/components/ui/ActionIcon'
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
  /** Kompakt-Label (Scroll) — default: letztes Wort = Verb */
  shortLabel?: string
}

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
  /**
   * Zweite Action: Desktop + Mobil als Secondary-Button neben Primary
   * (nicht im ⋯-Menü).
   */
  secondary?: DetailActionDef | null
  menuItems?: ActionsMenuItem[]
  sheetTitle?: string
}

function ActionControl({
  action,
  className,
  size = 'sm',
  compact = false,
}: {
  action: DetailActionDef
  className?: string
  size?: 'sm' | 'md'
  compact?: boolean
}) {
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

  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(
          'btn primary inline-flex items-center justify-center gap-1.5',
          size === 'md' ? 'h-11 px-4 text-[length:var(--fs-title)]' : 'sm',
          className
        )}
        aria-label={action.label}
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
 * Mobil Hybrid: oben nur Bottom-Nav; nach Scroll Nav weg + floating CTA.
 */
export function DetailActionsBar({
  primary,
  secondary,
  menuItems = [],
  sheetTitle = 'Aktionen',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [topActionsEl, setTopActionsEl] = useState<HTMLElement | null>(null)
  const isMobile = useIsMobile()
  const { scrolled } = useMobileScrollChrome(isMobile)
  const hasMobilePrimary = Boolean(mounted && isMobile && primary)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted || !isMobile) {
      setTopActionsEl(null)
      return
    }
    setTopActionsEl(document.getElementById('detail-entity-top-overflow'))
  }, [mounted, isMobile])

  /* Hybrid: body-Klassen steuern Bottom-Nav ↔ CTA (CSS). */
  useEffect(() => {
    const root = document.body
    if (!hasMobilePrimary) {
      root.classList.remove('has-detail-mobile-cta', 'detail-cta-mode')
      return
    }
    root.classList.add('has-detail-mobile-cta')
    root.classList.toggle('detail-cta-mode', scrolled)
    return () => {
      root.classList.remove('has-detail-mobile-cta', 'detail-cta-mode')
    }
  }, [hasMobilePrimary, scrolled])

  const cleanMenuItems = useMemo(
    () => withoutPrimaryDuplicate(menuItems, primary?.label),
    [menuItems, primary?.label]
  )

  const showOverflow = hasMenuContent(cleanMenuItems)
  const alonePrimary = Boolean(primary) && !showOverflow && !secondary
  const pairCtas = Boolean(primary && secondary)

  const menuTrigger = (compact: boolean, items: ActionsMenuItem[], className?: string) => (
    <ActionsMenu
      sheetTitle={sheetTitle}
      items={items}
      trigger={
        <button
          type="button"
          className={cn(
            'qa-btn inline-flex items-center justify-center',
            compact && 'detail-top-more',
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

  const desktop: ReactNode = (
    <div
      className={cn(
        'detail-actions-desktop hidden items-center gap-2 md:flex',
        alonePrimary ? 'justify-center w-full' : 'justify-end w-full'
      )}
    >
      {secondary ? (
        <button
          type="button"
          className="btn secondary sm inline-flex shrink-0 gap-1.5"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          aria-label={secondary.label}
        >
          {secondary.icon ? <ActionIcon n={secondary.icon} size={14} /> : null}
          {secondary.label}
        </button>
      ) : null}
      {showOverflow ? menuTrigger(false, cleanMenuItems) : null}
      {primary ? <ActionControl action={primary} /> : null}
    </div>
  )

  const mobileTopOverflow =
    mounted && isMobile && showOverflow && topActionsEl
      ? createPortal(menuTrigger(true, cleanMenuItems), topActionsEl)
      : null

  const mobileBar =
    mounted && isMobile && primary
      ? createPortal(
          <div
            className={cn(
              'detail-mobile-action-bar md:hidden',
              !scrolled && 'detail-mobile-action-bar--hidden',
              scrolled && 'detail-mobile-action-bar--nav-replaced',
              alonePrimary && 'detail-mobile-action-bar--solo',
              pairCtas && 'detail-mobile-action-bar--pair'
            )}
            role="toolbar"
            aria-label="Aktionen"
            aria-hidden={!scrolled}
          >
            <div
              className={cn(
                'detail-mobile-action-bar__inner',
                alonePrimary && 'detail-mobile-action-bar__inner--solo',
                pairCtas && 'detail-mobile-action-bar__inner--pair'
              )}
            >
              {secondary ? (
                <button
                  type="button"
                  className="btn secondary detail-mobile-action-bar__secondary"
                  onClick={secondary.onClick}
                  disabled={secondary.disabled}
                  aria-label={secondary.label}
                >
                  {secondary.icon ? <ActionIcon n={secondary.icon} size={16} /> : null}
                  <span className="detail-mobile-action-bar__label min-w-0 truncate">
                    {secondary.label}
                  </span>
                </button>
              ) : null}
              <ActionControl
                action={primary}
                size="md"
                compact={false}
                className={cn(
                  'detail-mobile-action-bar__primary',
                  alonePrimary && 'detail-mobile-action-bar__primary--solo',
                  pairCtas && 'detail-mobile-action-bar__primary--pair'
                )}
              />
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      {desktop}
      {mobileTopOverflow}
      {mobileBar}
    </>
  )
}
