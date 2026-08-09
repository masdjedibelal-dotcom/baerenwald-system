'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Vollbild-Flows (Wizard, Baustelle): fixer Header, scrollbarer Body, fixer Footer.
 * Rendert per Portal auf document.body — sonst clippt die CRM-Shell (overflow:hidden)
 * und der Wizard wirkt unsichtbar / nicht zentriert.
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className={cn('app-flow-screen wizard-flow', className)} role="dialog" aria-modal="true">
      <header className="app-flow-header">{header}</header>
      <div className="app-flow-body">{children}</div>
      {footer ? <footer className="app-flow-footer">{footer}</footer> : null}
    </div>,
    document.body
  )
}

/** Fortschrittspunkte für mehrstufige Flows */
export function AppFlowStepDots({
  total,
  current,
  compact = false,
  className,
}: {
  total: number
  current: number
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        compact ? 'gap-1' : 'gap-1.5 py-1',
        className
      )}
      aria-label={`Schritt ${current} von ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full transition-all',
            compact ? 'h-1' : 'h-1.5',
            i + 1 === current
              ? compact
                ? 'w-4 bg-bw-primary'
                : 'w-5 bg-bw-primary'
              : compact
                ? 'w-1 bg-bw-border'
                : 'w-1.5 bg-bw-border',
            i + 1 < current && 'bg-bw-primary/40'
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}
