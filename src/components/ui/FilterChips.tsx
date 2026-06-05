'use client'

import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface FilterChipsProps {
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
  multiple?: boolean
  /** `grid` — große Touch-Ziele im Mobil-Filter-Sheet */
  variant?: 'row' | 'grid'
  className?: string
}

export function FilterChips({
  options,
  selected,
  onChange,
  multiple = false,
  variant = 'row',
  className = '',
}: FilterChipsProps) {
  const toggle = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value))
      } else {
        onChange([...selected, value])
      }
    } else {
      onChange(selected[0] === value ? [] : [value])
    }
  }

  return (
    <div
      className={cn(
        variant === 'grid'
          ? 'grid grid-cols-2 gap-2'
          : 'chiprow flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {options.map((opt) => {
        const isOn = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'chip shrink-0',
              variant === 'grid' && 'chip-grid min-h-[44px] justify-center px-3 py-2.5 text-[13px]',
              isOn && 'chip-active'
            )}
          >
            {opt.label}
            {opt.count !== undefined ? <span className="chip-count">{opt.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
