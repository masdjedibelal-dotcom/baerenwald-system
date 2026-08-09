'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, hint, error, id, options, ...props },
  ref
) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label ? (
        <label className="input-label" htmlFor={inputId}>
          {label}
          {props.required ? (
            <span className="ml-0.5 text-bw-accent" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <select
        ref={ref}
        id={inputId}
        {...props}
        className={cn('input', error && 'input-error', className)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
})

Select.displayName = 'Select'
