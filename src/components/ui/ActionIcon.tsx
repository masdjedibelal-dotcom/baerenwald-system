'use client'

import type { CSSProperties } from 'react'
import { resolveMockIcon, type MockIconName } from '@/lib/mock-icons'
import { cn } from '@/lib/utils'

/** Feinere Stroke als Tabler-Mock (2) — wirkt aktueller in Action-Bars. */
export const ACTION_ICON_STROKE = 1.75

/**
 * Moderne Lucide-Icons für Bottom-Action-Bars (DocBar, QuickBar, Swipe, CTAs).
 * Gleiche Namens-API wie MockIcon (`n="phone"`), aber Lucide statt Tabler-SVG.
 */
export function ActionIcon({
  n,
  size = 20,
  className,
  strokeWidth = ACTION_ICON_STROKE,
  title,
  style,
}: {
  n: MockIconName | string
  size?: number
  className?: string
  strokeWidth?: number
  title?: string
  style?: CSSProperties
}) {
  let Icon
  try {
    Icon = resolveMockIcon(n)
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Unbekanntes Action-Icon: "${n}"`)
    }
    return null
  }

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={cn('action-icon shrink-0', className)}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      style={style}
    />
  )
}
