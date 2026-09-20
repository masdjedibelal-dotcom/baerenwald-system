'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import type { ReactNode } from 'react'
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
    label: 'Position',
    sub: 'Preisliste oder frei',
    icon: <MockIcon n="plus" ctx="default" className="h-4 w-4" />,
  },
  {
    kind: 'freitext',
    label: 'Freitext',
    sub: 'Hinweis ohne Preis',
    icon: <MockIcon n="list" ctx="default" className="h-4 w-4" />,
  },
  {
    kind: 'nachlass',
    label: 'Nachlass',
    sub: 'Rabatt auf Summe',
    icon: <MockIcon n="percentage" ctx="default" className="h-4 w-4" />,
  },
]

/** Toolbar: Position (Sheet) · Freitext · Nachlass — optional gefiltert via `kinds`. */
export function PosAddRow({
  onAdd,
  disabledKinds,
  kinds,
  className,
}: {
  onAdd: (kind: PosAddKind) => void
  disabledKinds?: Partial<Record<PosAddKind, boolean>>
  /** Welche Buttons zeigen — Default: Position · Freitext · Nachlass */
  kinds?: PosAddKind[]
  className?: string
}) {
  const visible = kinds?.length
    ? OPTIONS.filter((o) => kinds.includes(o.kind))
    : OPTIONS.filter((o) => o.kind !== 'preisliste')

  return (
    <div className={cn('pos-add-row', className)}>
      {visible.map((opt) => {
        const disabled = Boolean(disabledKinds?.[opt.kind])
        return (
          <MockBtn className="pos-add-btn" key={opt.kind} type="button" disabled={disabled} onClick={() => onAdd(opt.kind)}>
            <span className="icon-wrap">{opt.icon}</span>
            <span className="lbl-block">
              <span>{opt.label}</span>
              <span className="sub">{opt.sub}</span>
            </span>
          </MockBtn>
        )
      })}
    </div>
  )
}
