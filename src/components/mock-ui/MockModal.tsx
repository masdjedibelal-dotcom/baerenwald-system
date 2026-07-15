'use client'

import { useEffect, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export function MockModal({
  open,
  onClose,
  icon,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  icon?: string
  title: string
  sub?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose()
      }}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-h">
          {icon ? (
            <div className="icon">
              <MockIcon n={icon} size={16} />
            </div>
          ) : null}
          <div style={{ flex: 1 }}>
            <div className="title">{title}</div>
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
          <MockBtn icon="x" kind="ghost" sm onClick={onClose} />
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  )
}
