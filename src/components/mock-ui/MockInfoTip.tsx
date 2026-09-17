'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Kanonischer Info-Hinweis (i-Icon + kurzer Text).
 * Neue Hinweise nur noch darüber — kein nacktes `title=` / dekoratives info ohne Inhalt.
 * 1–2 Sätze; kein Absatz unter der Überschrift.
 */
export function MockInfoTip({
  tip,
  label = 'Hinweis',
  className,
  align = 'left',
}: {
  tip: ReactNode
  /** a11y-Label für den Trigger */
  label?: string
  className?: string
  align?: 'left' | 'right'
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)

  return (
    <span className={cn('mock-info-tip', className)} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="mock-info-tip__btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        title={typeof tip === 'string' ? tip : label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onBlur={() => {
          // Delay: Klick auf Tip-Inhalt noch erlauben
          window.setTimeout(() => {
            if (!tipRef.current?.contains(document.activeElement)) setOpen(false)
          }, 0)
        }}
      >
        <MockIcon ctx="btn" n="info-circle" size={15} />
      </button>
      {open ? (
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          className={cn('mock-info-tip__panel', align === 'right' && 'mock-info-tip__panel--right')}
          tabIndex={-1}
        >
          {tip}
        </span>
      ) : null}
    </span>
  )
}
