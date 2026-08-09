'use client'

import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { cn } from '@/lib/utils'

type EuroNettoInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
  id?: string
  disabled?: boolean
  placeholder?: string
}

/** Netto-Euro-Feld: leer bei 0, Platzhalter statt Wert; beim Verlassen leer → 0. */
export function EuroNettoInput({
  value,
  onChange,
  className,
  id,
  disabled,
  placeholder = '0',
}: EuroNettoInputProps) {
  return (
    <div className="relative">
      <ClearableNumberInput
        id={id}
        value={value}
        onValueChange={onChange}
        min={0}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('input w-full pr-9', className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">
        €
      </span>
    </div>
  )
}
