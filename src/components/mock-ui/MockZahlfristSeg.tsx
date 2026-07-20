'use client'

import { ZAHLFRIST_SEG_OPTIONS, type ZahlfristSeg } from '@/lib/zahlfrist'

/** Mock `Seg` für Zahlfrist / Zahlungsziel. */
export function MockZahlfristSeg({
  value,
  onChange,
  'aria-label': ariaLabel = 'Zahlfrist',
}: {
  value: ZahlfristSeg
  onChange: (next: ZahlfristSeg) => void
  'aria-label'?: string
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {ZAHLFRIST_SEG_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
