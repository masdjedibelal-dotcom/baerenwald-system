import type { MockIconName } from '@/lib/mock-icons'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, kanalLabel } from '@/lib/utils'
import type { LeadKanal, LeadStatus } from '@/lib/types'

/** Lead-Status über einheitliches StatusBadge (Phase 1 / Spec §11). */
export function LeadStatusBadge({ status }: { status: LeadStatus | string }) {
  return <StatusBadge status={status} />
}

const kanalIcon: Record<LeadKanal, MockIconName> = {
  website: 'world',
  telefon: 'phone',
  whatsapp: 'message',
  email: 'mail',
  vor_ort: 'map-pin',
  hv_melder_link: 'link',
  hv_einladung: 'mail',
  hv_direkt: 'building',
  hv_katalog: 'building',
  hv_manuell: 'building',
  org_portal: 'building',
  org_funnel: 'building',
  org_service: 'building',
  sonstiges: 'circle',
}

export function KanalBadge({
  kanal,
  className,
}: {
  kanal: LeadKanal | string
  className?: string
}) {
  const icon = (kanalIcon as Record<string, MockIconName>)[kanal] ?? 'circle'
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1 rounded-card border border-bw-border bg-bw-bg px-2 py-0.5 text-xs font-medium text-bw-text',
        className
      )}
    >
      <MockIcon n={icon} ctx="default" size={14} className="text-bw-light" />
      <span>{kanalLabel(kanal)}</span>
    </span>
  )
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-card bg-status-done-bg px-2 py-0.5 text-xs font-medium text-status-done-text',
        className
      )}
    >
      {children}
    </span>
  )
}
