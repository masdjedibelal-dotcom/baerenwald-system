'use client'

import { cn } from '@/lib/utils'

export function StaffChoiceGrid({
  options,
  value,
  values,
  multi,
  onChange,
  onToggle,
  columns = 2,
}: {
  options: { value: string; label: string; hint?: string }[]
  value?: string
  values?: string[]
  multi?: boolean
  onChange?: (v: string) => void
  onToggle?: (v: string) => void
  columns?: 1 | 2 | 3
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = multi ? values?.includes(o.value) : value === o.value
        return (
          <button
            key={o.value}
            type="button"
            className={cn(
              'rounded-[10px] border px-3.5 py-3 text-left transition',
              selected
                ? 'border-[var(--green)] bg-[var(--green-10)] shadow-[inset_0_0_0_1px_var(--green)]'
                : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-soft)]'
            )}
            onClick={() => (multi ? onToggle?.(o.value) : onChange?.(o.value))}
          >
            <div className="text-[13.5px] font-semibold text-[var(--text)]">{o.label}</div>
            {o.hint ? (
              <div className="mt-0.5 text-[12px] text-[var(--text-3)]">{o.hint}</div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function StaffSkipHint({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      className="mt-4 text-[12.5px] font-medium text-[var(--text-3)] underline-offset-2 hover:text-[var(--text)] hover:underline"
      onClick={onSkip}
    >
      Weiß ich nicht / überspringen
    </button>
  )
}

export function StaffStepTitle({
  title,
  sub,
}: {
  title: string
  sub?: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      {sub ? <p className="mt-1 text-[13px] text-[var(--text-3)]">{sub}</p> : null}
    </div>
  )
}
