import { cn } from '@/lib/utils'
import { SkeletonDetailPage, SkeletonListPage } from '@/components/ui/Skeleton'

/** Volle Seitenfläche — für Next.js `loading.tsx` und schwere Detail-Routen. */
export function CrmPageLoading({
  label = 'Wird geladen …',
  className,
  variant = 'spinner',
}: {
  label?: string
  className?: string
  /** list = Chip+Rows · detail = Kopf+Tabs · spinner = klassisch */
  variant?: 'spinner' | 'list' | 'detail'
}) {
  if (variant === 'list') {
    return (
      <div className={cn(className)} role="status" aria-busy="true" aria-label={label}>
        <SkeletonListPage />
        <span className="sr-only">{label}</span>
      </div>
    )
  }
  if (variant === 'detail') {
    return (
      <div className={cn(className)} role="status" aria-busy="true" aria-label={label}>
        <SkeletonDetailPage />
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn('page-loading', className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="page-loading__spinner" aria-hidden />
      <span className="page-loading__label">{label}</span>
    </div>
  )
}

/** Kompakter Placeholder — Suspense, Tabs, Inline-Nachladen. */
export function CrmInlineLoading({
  label = 'Wird geladen …',
  className,
  minHeight = 160,
}: {
  label?: string
  className?: string
  minHeight?: number
}) {
  return (
    <div
      className={cn('page-loading page-loading--inline', className)}
      role="status"
      aria-busy="true"
      aria-label={label}
      style={{ minHeight }}
    >
      <span className="page-loading__spinner page-loading__spinner--sm" aria-hidden />
      <span className="page-loading__label">{label}</span>
    </div>
  )
}
