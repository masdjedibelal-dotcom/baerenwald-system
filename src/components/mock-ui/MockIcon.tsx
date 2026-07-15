'use client'

import { cn } from '@/lib/utils'
import {
  ICON_MAP,
  isMockIconName,
  type MockIconName,
} from '@/lib/mock-icons'

export type MockIconProps = {
  /** Tabler-/Mock-Icon-Name (`Icon n="…"`). */
  n: MockIconName | string
  /** Default `1em` wie im Mock; Zahl = px. */
  size?: number | string
  className?: string
  strokeWidth?: number
  /** z. B. für `star-filled` */
  fill?: string
  title?: string
}

/**
 * Zentrale Icon-Darstellung über das Mock→lucide-Mapping.
 * Unbekannte Namen → Fehler (Dev) / null (Prod) — kein Platzhalter-Icon.
 */
export function MockIcon({
  n,
  size = '1em',
  className,
  strokeWidth = 2,
  fill,
  title,
}: MockIconProps) {
  if (!isMockIconName(n)) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`Unbekanntes Mock-Icon: "${n}"`)
    }
    return null
  }

  const Icon = ICON_MAP[n]
  const dim = typeof size === 'number' ? size : undefined
  const style =
    typeof size === 'string'
      ? { width: size, height: size }
      : undefined

  return (
    <Icon
      className={cn('mock-icon shrink-0', className)}
      size={dim}
      style={style}
      strokeWidth={strokeWidth}
      fill={fill}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    />
  )
}

/** Fertiges Menü-/Listen-Icon (Mock-Default 15–16px). */
export function mockMenuIcon(n: MockIconName, size = 15) {
  return <MockIcon n={n} size={size} />
}
