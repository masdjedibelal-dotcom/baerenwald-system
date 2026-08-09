'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/** Mock `FormSection` — Sektionskopf + form-grid */
export function MockFormSection({
  title,
  icon,
  children,
  columns,
  className,
}: {
  title?: string
  icon?: string
  children: ReactNode
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('form-section', className)}>
      {title ? (
        <div className="form-section-h">
          {icon ? <MockIcon ctx="default" n={icon} size={13} /> : null}
          {title}
        </div>
      ) : null}
      <div
        className="form-grid form-grid--sheet"
        style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

/** Mock `Field` */
export function MockField({
  label,
  required,
  hint,
  error,
  children,
  full,
  className,
}: {
  label?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  full?: boolean
  className?: string
}) {
  return (
    <div className={cn('field', full && 'full', error && 'has-error', className)}>
      {label ? (
        <label className="field-label">
          {label}
          {required ? <span className="req">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <div className="field-hint">{hint}</div> : null}
      {error ? <div className="field-hint field-error">{error}</div> : null}
    </div>
  )
}
