'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

function telDigits(tel: string) {
  return tel.replace(/\D/g, '')
}

type ListRowQuickActionsProps = {
  phone?: string | null
  /** Stammdaten-Listen: Mock `.row-actions.always` */
  alwaysVisible?: boolean
  className?: string
}

/**
 * Mock `.row-actions` / `.qa-btn` — nur vorhandene Quick-Actions (tel/WA).
 * Kein Dots-Menü ohne echte List-Row-Menü-Logik (Struktur-Lücke → Wave 2).
 */
export function ListRowQuickActions({
  phone,
  alwaysVisible = false,
  className,
}: ListRowQuickActionsProps) {
  const digits = phone?.trim() ? telDigits(phone.trim()) : ''
  if (!digits) return null

  return (
    <div
      className={cn('row-actions', alwaysVisible && 'always', className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="qa-btn"
        title="Anrufen"
        onClick={() => {
          window.location.href = `tel:${digits}`
        }}
      >
        <MockIcon n="phone" size={15} />
      </button>
      <button
        type="button"
        className="qa-btn"
        title="WhatsApp"
        onClick={() => window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer')}
      >
        <MockIcon n="brand-whatsapp" size={15} />
      </button>
    </div>
  )
}
