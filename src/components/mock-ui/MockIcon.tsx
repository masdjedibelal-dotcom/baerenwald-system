'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { iconCtxClass, type IconContext } from '@/lib/icon-context'
import {
  FILLED_MOCK_ICONS,
  isMockIconName,
  MOCK_ICON_STROKE_WIDTH,
  type MockIconName,
} from '@/lib/mock-icons'
import { getMockIconSvg } from '@/lib/mock-icon-svgs'

export type MockIconProps = {
  /** Tabler-/Mock-Icon-Name (`Icon n="…"`). */
  n: MockIconName | string
  /** Farb-Kontext → --icon-*-Token (Build-Check). */
  ctx: IconContext
  /** Default `1em` wie im Mock; Zahl = px. */
  size?: number | string
  className?: string
  /** Override; Default = Mock/Tabler stroke-width 2 (≈1.5px bei 18px). */
  strokeWidth?: number
  title?: string
  style?: CSSProperties
}

function prepareSvg(svg: string, strokeWidth: number, filled: boolean): string {
  let out = svg
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"')
  out = out.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`)
  if (filled) {
    // filled Tabler variants already set fill on paths; keep
    return out
  }
  // Absicherung: nie Browser-Default-Fill (schwarz)
  if (!/fill="none"/.test(out) && !/fill='none'/.test(out)) {
    out = out.replace('<svg', '<svg fill="none"')
  }
  return out
}

/**
 * Mock/Tabler-Icons 1:1 (embedded SVGs aus Mock-Standalone).
 * Stroke-only: fill=none, stroke=currentColor — nie Lucide-Filled / nie fill=undefined.
 */
export function MockIcon({
  n,
  ctx,
  size = '1em',
  className,
  strokeWidth = MOCK_ICON_STROKE_WIDTH,
  title,
  style,
}: MockIconProps) {
  if (!isMockIconName(n)) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Unbekanntes Mock-Icon: "${n}"`)
    }
    return null
  }

  const raw = getMockIconSvg(n)
  if (!raw) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Kein Tabler-SVG für Mock-Icon: "${n}"`)
    }
    return null
  }

  const filled = FILLED_MOCK_ICONS.has(n)
  const dim = typeof size === 'number' ? `${size}px` : size
  const html = prepareSvg(raw, strokeWidth, filled)

  return (
    <span
      className={cn(
        'mock-icon',
        'ti',
        `ti-${n}`,
        filled && 'mock-icon-filled',
        iconCtxClass(ctx),
        className
      )}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        flexShrink: 0,
        lineHeight: 0,
        color: 'inherit',
        ...style,
      }}
    />
  )
}

/** Fertiges Menü-/Listen-Icon (Mock-Default 15–16px). */
export function mockMenuIcon(n: MockIconName, size = 15, ctx: IconContext = 'row') {
  return <MockIcon n={n} size={size} ctx={ctx} />
}
