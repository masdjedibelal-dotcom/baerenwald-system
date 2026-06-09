import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

/** Kleine Meta-Zeile im Projekt-Kopf (PLZ, Betrag, Datum …) */
export function DetailMetaChip({ icon: Icon, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1.5 rounded-lg border border-bw-border/80 bg-bw-bg px-2.5 py-1 text-xs font-medium text-bw-text-mid',
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-bw-light" aria-hidden /> : null}
      {children}
    </span>
  )
}

export function DetailMetaRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('detail-meta-row', className)}>
      {children}
    </div>
  )
}
