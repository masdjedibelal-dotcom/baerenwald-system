'use client'

import type { ReactNode } from 'react'
import { AlignLeft, ListFilter, Percent, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PosAddKind = 'position' | 'preisliste' | 'freitext' | 'nachlass'

const OPTIONS: {
  kind: PosAddKind
  label: string
  sub: string
  icon: ReactNode
}[] = [
  {
    kind: 'position',
    label: 'Freie Position',
    sub: 'leer anlegen',
    icon: <Plus className="h-4 w-4" />,
  },
  {
    kind: 'preisliste',
    label: 'Aus Preisliste',
    sub: 'Vorlage wählen',
    icon: <ListFilter className="h-4 w-4" />,
  },
  {
    kind: 'freitext',
    label: 'Freitext',
    sub: 'Hinweis ohne Preis',
    icon: <AlignLeft className="h-4 w-4" />,
  },
  {
    kind: 'nachlass',
    label: 'Nachlass',
    sub: 'Rabatt auf Summe',
    icon: <Percent className="h-4 w-4" />,
  },
]

/** Mock-Toolbar: 4 Möglichkeiten Positionen hinzuzufügen. */
export function PosAddRow({
  onAdd,
  disabledKinds,
  className,
}: {
  onAdd: (kind: PosAddKind) => void
  disabledKinds?: Partial<Record<PosAddKind, boolean>>
  className?: string
}) {
  return (
    <div className={cn('pos-add-row', className)}>
      {OPTIONS.map((opt) => {
        const disabled = Boolean(disabledKinds?.[opt.kind])
        return (
          <button
            key={opt.kind}
            type="button"
            className="pos-add-btn"
            disabled={disabled}
            onClick={() => onAdd(opt.kind)}
          >
            <span className="icon-wrap">{opt.icon}</span>
            <span className="lbl-block">
              <span>{opt.label}</span>
              <span className="sub">{opt.sub}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
