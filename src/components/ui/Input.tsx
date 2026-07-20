'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = '', id, ...props },
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
      <input
        ref={ref}
        id={inputId}
        {...props}
        className={cn('input', error && 'input-error', className)}
      />
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
})

Input.displayName = 'Input'
