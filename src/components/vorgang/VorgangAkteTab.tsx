'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type AkteSegment = 'zahlung' | 'dateien' | 'kunde'

const SEGMENTS: { id: AkteSegment; label: string }[] = [
  { id: 'zahlung', label: 'Zahlung' },
  { id: 'dateien', label: 'Dateien' },
  { id: 'kunde', label: 'Kunde' },
]

/**
 * Tab Akte — Segmente Zahlung | Dateien | Kunde (Spec §4).
 */
export function VorgangAkteTab({
  zahlung,
  dateien,
  kunde,
  initialSegment = 'zahlung',
  hideZahlung = false,
  onSegmentChange,
}: {
  zahlung?: ReactNode
  dateien: ReactNode
  kunde: ReactNode
  initialSegment?: AkteSegment
  hideZahlung?: boolean
  onSegmentChange?: (s: AkteSegment) => void
}) {
  const visible = hideZahlung
    ? SEGMENTS.filter((s) => s.id !== 'zahlung')
    : SEGMENTS
  const [segment, setSegment] = useState<AkteSegment>(() => {
    if (hideZahlung && initialSegment === 'zahlung') return 'dateien'
    return initialSegment
  })

  useEffect(() => {
    if (hideZahlung && segment === 'zahlung') setSegment('dateien')
  }, [hideZahlung, segment])

  function select(s: AkteSegment) {
    setSegment(s)
    onSegmentChange?.(s)
  }

  return (
    <div className="vorgang-akte-tab space-y-4">
      <div
        className="pos-segmented flex w-full max-w-md"
        role="tablist"
        aria-label="Akte"
      >
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={segment === s.id}
            className={cn(
              'pos-segmented__btn flex-1 text-center',
              segment === s.id && 'pos-segmented__btn--active'
            )}
            onClick={() => select(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {segment === 'zahlung' && !hideZahlung ? zahlung : null}
      {segment === 'dateien' ? dateien : null}
      {segment === 'kunde' ? kunde : null}
    </div>
  )
}
