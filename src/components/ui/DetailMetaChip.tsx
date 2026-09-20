import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { cn } from '@/lib/utils'

type Props = {
  icon?: MockIconName | string
  children: React.ReactNode
  className?: string
}

/** Kleine Meta-Zeile im Projekt-Kopf (PLZ, Betrag, Datum …) */
export function DetailMetaChip({ icon, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1.5 rounded-card border border-bw-border/80 bg-bw-bg px-2.5 py-1 text-xs font-medium text-bw-text-mid',
        className
      )}
    >
      {icon ? <MockIcon n={icon} ctx="default" size={14} /> : null}
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
