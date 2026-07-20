'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { cn } from '@/lib/utils'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

/**
 * Früher rechtes Sidepanel — laut Mock Erstellen/Bearbeiten/Preview als zentriertes Sheet-Modal.
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  children,
  width = 'md',
}: SidePanelProps) {
  const [mounted, setMounted] = useState(false)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [open, handleKey])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('sheet', (width === 'lg' || width === 'md') && width === 'lg' && 'wide')}
        style={
          width === 'sm'
            ? { width: 'min(420px, 100%)' }
            : width === 'md'
              ? { width: 'min(640px, 100%)' }
              : undefined
        }
      >
        <div className="sheet-h">
          <div className="title flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate">{title}</span>
            {badge}
          </div>
          <MockBtn sm kind="ghost" icon="x" onClick={onClose} title="Schließen" />
        </div>
        {subtitle ? (
          <div className="border-b border-bw-border px-5 py-2 text-[13px] text-bw-text-muted">{subtitle}</div>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-bw-border bg-bw-bg-soft px-5 py-3">
            {actions}
          </div>
        ) : null}
        <div className="sheet-b">{children}</div>
      </div>
    </div>,
    document.body
  )
}
