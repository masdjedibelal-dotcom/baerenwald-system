import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:opacity-95 active:opacity-90 disabled:opacity-60',
  secondary:
    'bg-surface text-ink border border-border hover:bg-canvas active:bg-canvas disabled:opacity-60',
  danger:
    'bg-danger text-white hover:opacity-95 active:opacity-90 disabled:opacity-60',
  ghost:
    'bg-transparent text-ink hover:bg-black/[0.04] active:bg-black/[0.06] disabled:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3 text-sm',
  md: 'min-h-[44px] px-4 text-base',
  lg: 'min-h-[48px] px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner
              className="h-5 w-5"
              tone={
                variant === 'primary' || variant === 'danger'
                  ? 'inverted'
                  : 'default'
              }
            />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
