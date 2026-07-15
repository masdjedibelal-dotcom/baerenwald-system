'use client'

import { useEffect, useState, useCallback } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

let dispatchToast: ((type: ToastType, message: string) => void) | null = null

function formatMessage(title: string, opts?: { description?: string }): string {
  if (opts?.description) return `${title} — ${opts.description}`
  return title
}

/** Mock-Toast: unten zentriert, grün mit Check — wie Standalone-Mock */
export const toast = {
  success: (msg: string) => dispatchToast?.('success', msg),
  error: (msg: string) => dispatchToast?.('error', msg),
  info: (msg: string) => dispatchToast?.('info', msg),
  message: (title: string, opts?: { description?: string }) =>
    dispatchToast?.('info', formatMessage(title, opts)),
}

const AUTO_MS: Record<ToastType, number> = {
  success: 2600,
  error: 4000,
  info: 2600,
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, AUTO_MS[type])
  }, [])

  useEffect(() => {
    dispatchToast = push
    return () => {
      dispatchToast = null
    }
  }, [push])

  const active = toasts[toasts.length - 1]
  if (!active) return null

  return (
    <div
      className={cn('mock-toast', active.type === 'error' && 'error')}
      role="status"
      aria-live="polite"
    >
      {active.type !== 'error' ? <MockIcon n="check" size={16} /> : null}
      <span>{active.message}</span>
    </div>
  )
}
