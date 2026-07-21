'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
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

export const toast = {
  success: (msg: string) => dispatchToast?.('success', msg),
  error: (msg: string) => dispatchToast?.('error', msg),
  info: (msg: string) => dispatchToast?.('info', msg),
  message: (title: string, opts?: { description?: string }) =>
    dispatchToast?.('info', formatMessage(title, opts)),
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    const ms = type === 'error' ? 5000 : 3000
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, ms)
  }, [])

  useEffect(() => {
    dispatchToast = push
    return () => {
      dispatchToast = null
    }
  }, [push])

  return (
    <div
      className="pointer-events-none fixed right-4 top-14 z-toast flex w-full max-w-md flex-col gap-2 px-4 md:top-16 md:px-0"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-lg border bg-bw-card px-4 py-3 text-sm font-medium shadow-lg animate-slide-up',
              t.type === 'success' && 'border-status-order-bg text-status-order-text',
              t.type === 'error' && 'border-status-cancel-bg text-status-cancel-text',
              t.type === 'info' && 'border-status-new-bg text-status-new-text'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-current opacity-60 hover:opacity-100"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
