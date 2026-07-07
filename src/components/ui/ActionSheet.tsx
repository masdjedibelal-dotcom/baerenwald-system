'use client'

import { X } from 'lucide-react'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import { cn } from '@/lib/utils'

function flattenItems(items: ActionsMenuItem[]): Exclude<ActionsMenuItem, 'sep'>[] {
  return items.filter((it): it is Exclude<ActionsMenuItem, 'sep'> => it !== 'sep')
}

export function ActionSheet({
  open,
  onClose,
  title = 'Aktionen',
  items,
}: {
  open: boolean
  onClose: () => void
  title?: string
  items: ActionsMenuItem[]
}) {
  if (!open) return null

  const flat = flattenItems(items)
  const regular = flat.filter((it) => !it.danger)
  const danger = flat.filter((it) => it.danger)

  function run(item: Exclude<ActionsMenuItem, 'sep'>) {
    onClose()
    item.onClick()
  }

  return (
    <>
      <div
        className="z-sidepanel fixed inset-0 bg-black/40 md:hidden"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />

      <div
        className="z-modal fixed bottom-0 left-0 right-0 max-h-[min(85vh,640px)] animate-slide-up overflow-hidden rounded-t-2xl bg-bw-card md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-bw-border" aria-hidden />
        </div>

        <div className="flex items-center justify-between border-b border-bw-border px-4 py-2">
          <span className="text-[15px] font-semibold text-bw-text">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md text-bw-text-muted hover:bg-bw-hover"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-3 py-2">
          {regular.map((it) => (
            <button
              key={it.label}
              type="button"
              className="action-sheet-item flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-bw-text transition-colors active:bg-bw-hover"
              onClick={() => run(it)}
            >
              {it.icon ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-bw-primary">
                  {it.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">{it.label}</span>
              {it.hint ? (
                <span className="shrink-0 text-xs font-normal text-bw-text-muted">{it.hint}</span>
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
                    'action-sheet-item flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors active:bg-status-cancel-bg/30',
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
    </>
  )
}
