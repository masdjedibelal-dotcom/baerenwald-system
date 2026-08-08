'use client'

import { ActionIcon } from '@/components/ui/ActionIcon'
import { cn } from '@/lib/utils'

export type QuickBarAction = {
  id: string
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
}

/** Mobil Spec §4: Anrufen · Mail · Notiz · Dokument */
export function DetailQuickBar({
  actions,
  className,
}: {
  actions: QuickBarAction[]
  className?: string
}) {
  if (!actions.length) return null
  return (
    <div className={cn('detail-quickbar', className)} role="toolbar" aria-label="Schnellaktionen">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className="detail-quickbar__btn"
          disabled={a.disabled}
          onClick={a.onClick}
        >
          <ActionIcon n={a.icon} size={18} />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  )
}
