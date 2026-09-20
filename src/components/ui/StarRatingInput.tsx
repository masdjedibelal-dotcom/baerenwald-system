'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { cn } from '@/lib/utils'

export function StarRatingInput({
  value,
  onChange,
  label,
  hint,
  disabled,
  name,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  hint?: string
  disabled?: boolean
  name?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-fs-text font-medium text-bw-text">{label}</p>
        {hint ? <p className="text-xs text-bw-text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = value >= star
          return (
            <MockBtn className={cn(
                'rounded-button p-0.5 transition-colors disabled:opacity-50',
                active ? 'text-warning' : 'text-bw-border hover:text-warning'
              )} key={star} type="button" name={name} role="radio" aria-checked={value === star} aria-label={`${star} von 5 Sternen`} disabled={disabled} onClick={() => onChange(star)}>
              <MockIcon n="star" ctx="default" className={cn('h-5 w-5', active && 'fill-current')} aria-hidden />
            </MockBtn>
          )
        })}
      </div>
    </div>
  )
}
