import { cn } from '@/lib/utils'

export function LoadingSpinner({
  className,
  label = 'Lädt …',
  tone = 'default',
}: {
  className?: string
  label?: string
  tone?: 'default' | 'inverted'
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block h-8 w-8 animate-spin rounded-full border-2',
        tone === 'inverted'
          ? 'border-white/35 border-t-white'
          : 'border-border border-t-primary',
        className
      )}
    />
  )
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[160px] w-full items-center justify-center py-10">
      <LoadingSpinner className="h-9 w-9" label={label} />
    </div>
  )
}
