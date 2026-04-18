import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatTile({
  href,
  label,
  value,
  icon: Icon,
  className,
}: {
  href: string
  label: string
  value: string | number
  icon: LucideIcon
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="text-[13px] text-muted">{label}</p>
      </div>
      <Icon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
    </Link>
  )
}
