'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActionSheet } from '@/components/ui/ActionSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type ActionsMenuItem =
  | 'sep'
  | {
      label: string
      icon?: ReactNode
      hint?: string
      danger?: boolean
      onClick: () => void
    }

export function ActionsMenu({
  trigger,
  items,
  align = 'right',
  sheetTitle = 'Aktionen',
}: {
  trigger: ReactNode
  items: ActionsMenuItem[]
  align?: 'left' | 'right'
  sheetTitle?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  useEffect(() => {
    if (!isMobile) return
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, isMobile])

  return (
    <>
      <div ref={ref} className="menu-wrap">
        <span
          role="button"
          tabIndex={0}
          className="inline-flex"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen((o) => !o)
            }
          }}
        >
          {trigger}
        </span>
        {open && !isMobile ? (
          <div className={cn('menu-panel', align === 'left' && 'left-0 right-auto')} role="menu">
            {items.map((it, i) => {
              if (it === 'sep') return <div key={`sep-${i}`} className="menu-sep" role="separator" />
              return (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  className={cn('menu-item', it.danger && 'menu-item-danger')}
                  onClick={() => {
                    setOpen(false)
                    it.onClick()
                  }}
                >
                  {it.icon ? (
                    <span className="flex w-[18px] shrink-0 justify-center">{it.icon}</span>
                  ) : null}
                  <span>{it.label}</span>
                  {it.hint ? <span className="menu-item-hint">{it.hint}</span> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {isMobile ? (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={sheetTitle}
          items={items}
        />
      ) : null}
    </>
  )
}
