'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import { useSheetSwipeDismiss } from '@/hooks/useSheetSwipeDismiss'
import { cn } from '@/lib/utils'

function flattenItems(items: ActionsMenuItem[]): Exclude<ActionsMenuItem, 'sep'>[] {
  return items.filter((it): it is Exclude<ActionsMenuItem, 'sep'> => it !== 'sep')
}

export function ActionSheet({
  open,
  onClose,
  title = 'Aktionen',
  items,
  swipeDismissBlocked = false,
}: {
  open: boolean
  onClose: () => void
  title?: string
  items: ActionsMenuItem[]
  /** Swipe-dismiss unterdrücken (z. B. verschachtelter Flow) */
  swipeDismissBlocked?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const { dragZoneProps, sheetMotionStyle } = useSheetSwipeDismiss({
    onDismiss: onClose,
    blocked: swipeDismissBlocked,
  })

  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  const flat = flattenItems(items)
  const regular = flat.filter((it) => !it.danger)
  const danger = flat.filter((it) => it.danger)

  function run(item: Exclude<ActionsMenuItem, 'sep'>) {
    onClose()
    item.onClick()
  }

  return createPortal(
    <>
      <div
        className="z-modal fixed inset-0 bg-black/40 md:hidden"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />

      <div
        className="z-modal fixed bottom-0 left-0 right-0 max-h-[min(85vh,640px)] animate-slide-up overflow-hidden rounded-t-2xl border-x border-t border-bw-border bg-white shadow-2xl md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          ...sheetMotionStyle,
        }}
      >
        <div className="flex justify-center pb-1 pt-3" {...dragZoneProps} aria-hidden>
          <div className="h-1 w-10 rounded-full bg-bw-border" />
        </div>

        <div className="flex items-center gap-2 border-b border-bw-border px-3 py-2" {...dragZoneProps}>
          <button
            type="button"
            onClick={onClose}
            className="editor-sheet__icon-btn"
            aria-label="Schließen"
            title="Schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <span className="min-w-0 flex-1 truncate text-[length:var(--fs-title)] font-semibold text-bw-text">
            {title}
          </span>
        </div>

        <div className="overflow-y-auto overscroll-contain px-3 py-2 pb-3">
          {regular.length === 0 && danger.length === 0 ? (
            <p className="px-3 py-4 text-center text-[length:var(--fs-meta)] text-bw-text-muted">
              Keine Aktionen
            </p>
          ) : null}
          {regular.map((it) => (
            <button
              key={it.label}
              type="button"
              className="action-sheet-item flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[length:var(--fs-title)] font-medium text-bw-text transition-colors active:bg-bw-hover"
              onClick={() => run(it)}
            >
              {it.icon ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-bw-primary">
                  {it.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">{it.label}</span>
              {it.hint ? (
                <span className="shrink-0 text-[length:var(--fs-meta)] font-normal text-bw-text-muted">
                  {it.hint}
                </span>
              ) : null}
            </button>
          ))}

          {danger.length > 0 ? (
            <>
              <div className="my-2 h-px bg-bw-border" role="separator" />
              {danger.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  className={cn(
                    'action-sheet-item flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[length:var(--fs-title)] font-medium transition-colors active:bg-status-cancel-bg/30',
                    'text-status-cancel-text'
                  )}
                  onClick={() => run(it)}
                >
                  {it.icon ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">{it.icon}</span>
                  ) : null}
                  <span className="min-w-0 flex-1">{it.label}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </>,
    document.body
  )
}
