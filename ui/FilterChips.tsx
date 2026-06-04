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
  className?: string
}

export function FilterChips({
  options,
  selected,
  onChange,
  multiple = false,
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
        'chiprow flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
            className={cn('chip shrink-0', isOn && 'chip-active')}
          >
            {opt.label}
            {opt.count !== undefined ? <span className="chip-count">{opt.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
