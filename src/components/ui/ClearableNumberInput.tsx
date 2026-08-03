'use client'

import { useEffect, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ClearableNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number
  onValueChange: (value: number) => void
  /** Wert, der als leer gilt und nur als Platzhalter erscheint (default 0). */
  emptyValue?: number
  /** Beim Verlassen des Feldes wenn leer (default: emptyValue). */
  blurEmptyValue?: number
  min?: number
  max?: number
}

function parseDraft(raw: string): number | null {
  const t = raw.replace(',', '.').trim()
  if (t === '' || t === '-' || t === '.' || t === ',') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * Zahlenfeld: bei 0 leer + Platzhalter „0“, Fokus löscht die 0 zum Tippen,
 * Blur mit leerem Feld schreibt emptyValue/blurEmptyValue zurück.
 */
export function ClearableNumberInput({
  value,
  onValueChange,
  emptyValue = 0,
  blurEmptyValue,
  min,
  max,
  className,
  placeholder = '0',
  disabled,
  id,
  onFocus,
  onBlur,
  ...rest
}: ClearableNumberInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const commitEmpty = blurEmptyValue ?? emptyValue
  const isEmptyDisplay = value === emptyValue

  useEffect(() => {
    if (!focused) setDraft('')
  }, [value, focused])

  function clamp(n: number): number {
    let x = n
    if (min != null && Number.isFinite(min)) x = Math.max(min, x)
    if (max != null && Number.isFinite(max)) x = Math.min(max, x)
    return x
  }

  return (
    <input
      {...rest}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      className={cn('tabular-nums', className)}
      value={focused ? draft : isEmptyDisplay ? '' : String(value)}
      onFocus={(e) => {
        setFocused(true)
        setDraft(isEmptyDisplay ? '' : String(value))
        onFocus?.(e)
        requestAnimationFrame(() => e.currentTarget.select())
      }}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        const parsed = parseDraft(next)
        if (parsed != null) onValueChange(clamp(parsed))
      }}
      onBlur={(e) => {
        setFocused(false)
        const parsed = parseDraft(draft)
        onValueChange(parsed != null ? clamp(parsed) : commitEmpty)
        setDraft('')
        onBlur?.(e)
      }}
    />
  )
}
