'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { DateInput } from '@/components/ui/DateInput'
import { TimeInput } from '@/components/ui/TimeInput'
import { cn } from '@/lib/utils'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string
  error?: string
  hint?: string
  /** Nur für native number/text; Date/Time nutzen eigene Kompakt-Größe intern. */
  size?: number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = '', id, type, size, ...props },
  ref
) {
  const inputId = id ?? props.name
  const isDate = type === 'date'
  const isTime = type === 'time'

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
      {isDate ? (
        <DateInput
          ref={ref}
          id={inputId}
          {...props}
          className={cn(error && 'input-error', className)}
        />
      ) : isTime ? (
        <TimeInput
          ref={ref}
          id={inputId}
          {...props}
          className={cn(error && 'input-error', className)}
        />
      ) : (
        <input
          ref={ref}
          id={inputId}
          type={type}
          size={size}
          {...props}
          className={cn('input', error && 'input-error', className)}
        />
      )}
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
})
