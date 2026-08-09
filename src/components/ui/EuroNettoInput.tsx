'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type EuroNettoInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
  id?: string
  disabled?: boolean
  placeholder?: string
}

function parseEuroDraft(raw: string): number | null {
  const t = raw.replace(',', '.').trim()
  if (t === '' || t === '-') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.max(0, n) : null
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
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!focused) setDraft('')
  }, [value, focused])

  const displayValue = focused
    ? draft
    : value > 0
      ? String(value)
      : ''

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={cn('input w-full pr-9 tabular-nums', className)}
        value={displayValue}
        onFocus={() => {
          setFocused(true)
          setDraft(value > 0 ? String(value) : '')
        }}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          const parsed = parseEuroDraft(next)
          if (parsed != null) onChange(parsed)
        }}
        onBlur={() => {
          setFocused(false)
          const parsed = parseEuroDraft(draft)
          onChange(parsed ?? 0)
          setDraft('')
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">
        €
      </span>
    </div>
  )
}
