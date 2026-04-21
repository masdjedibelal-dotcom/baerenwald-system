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
        'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
              'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150',
              isOn
                ? 'border-bw-primary bg-bw-primary text-white'
                : 'border-bw-border bg-bw-card text-bw-text-mid hover:border-bw-primary hover:text-bw-primary'
            )}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  isOn ? 'bg-white/20 text-white' : 'bg-bw-hover text-bw-text-muted'
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
