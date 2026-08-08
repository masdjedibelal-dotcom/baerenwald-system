'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className,
    type = 'button',
    ...props
  },
  ref
) {
  const kindClass =
    variant === 'primary'
      ? 'primary'
      : variant === 'secondary'
        ? 'secondary'
        : variant === 'danger'
          ? 'danger'
          : variant === 'ghost'
            ? 'ghost'
            : ''

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn('btn', kindClass, size === 'sm' && 'sm', fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="30"
            strokeDashoffset="10"
          />
        </svg>
      ) : null}
      {children}
    </button>
  )
})
