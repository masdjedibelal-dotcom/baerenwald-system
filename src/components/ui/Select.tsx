'use client'

import { forwardRef, type ChangeEvent, type SelectHTMLAttributes } from 'react'
import { Combobox, COMBOBOX_OPTION_THRESHOLD } from '@/components/ui/Combobox'
import { cn } from '@/lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string; sub?: string }[]
  /** Nur für Combobox-Fallback (>15 Optionen) */
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, hint, error, id, options, placeholder, ...props },
  ref
) {
  const inputId = id ?? props.name

  /** Spec §14: >15 Optionen → Combobox mit Tipp-Filter */
  if (options.length > COMBOBOX_OPTION_THRESHOLD) {
    const value = props.value == null ? '' : String(props.value)
    return (
      <Combobox
        label={label}
        hint={hint}
        error={error}
        id={inputId}
        name={props.name}
        required={props.required}
        disabled={props.disabled}
        className={className}
        options={options}
        value={value}
        placeholder={placeholder ?? 'Auswählen…'}
        onChange={(next) => {
          const handler = props.onChange
          if (!handler) return
          const synthetic = {
            target: { value: next, name: props.name ?? '' },
            currentTarget: { value: next, name: props.name ?? '' },
          } as ChangeEvent<HTMLSelectElement>
          handler(synthetic)
        }}
      />
    )
  }

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
