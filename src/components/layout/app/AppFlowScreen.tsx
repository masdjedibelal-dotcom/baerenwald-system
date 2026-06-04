'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Vollbild-Flows (Wizard, Baustelle): fixer Header, scrollbarer Body, fixer Footer mit Primary.
 * Ergänzt bestehende `.wizard`-Klasse auf Mobil.
 */
export function AppFlowScreen({
  header,
  children,
  footer,
  className,
}: {
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('app-flow-screen', className)} role="dialog" aria-modal="true">
      <header className="app-flow-header">{header}</header>
      <div className="app-flow-body">{children}</div>
      {footer ? <footer className="app-flow-footer">{footer}</footer> : null}
    </div>
  )
}

/** Fortschrittspunkte für mehrstufige Flows */
export function AppFlowStepDots({
  total,
  current,
}: {
  total: number
  current: number
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1" aria-label={`Schritt ${current} von ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i + 1 === current ? 'w-5 bg-bw-primary' : 'w-1.5 bg-bw-border',
            i + 1 < current && 'bg-bw-primary/40'
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}
