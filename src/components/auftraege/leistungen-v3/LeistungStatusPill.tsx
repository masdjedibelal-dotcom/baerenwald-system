'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LEISTUNG_STATUS_OPTIONS,
  leistungStatusBadgeClass,
  leistungStatusLabel,
  normalizeLeistungStatus,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { cn } from '@/lib/utils'

export function LeistungStatusPill({
  status,
  disabled,
  onChange,
}: {
  status: string | null | undefined
  disabled?: boolean
  onChange: (v: AuftragLeistungStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const value = normalizeLeistungStatus(status)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn('pos-v3-status-pill', leistungStatusBadgeClass(value))}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {leistungStatusLabel(value)}
      </button>
      {open ? (
        <div className="pos-v3-status-menu" role="menu">
          {LEISTUNG_STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              className={cn('pos-v3-status-menu-item', value === o.value && 'active')}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                if (o.value !== value) onChange(o.value)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
