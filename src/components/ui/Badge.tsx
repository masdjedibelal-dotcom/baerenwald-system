import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Circle,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, kanalLabel } from '@/lib/utils'
import type { LeadKanal, LeadStatus } from '@/lib/types'

/** Lead-Status über einheitliches StatusBadge (Phase 1 / Spec §11). */
export function LeadStatusBadge({ status }: { status: LeadStatus | string }) {
  return <StatusBadge status={status} />
}

const kanalIcon: Record<LeadKanal, LucideIcon> = {
  website: Globe,
  telefon: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  vor_ort: MapPin,
  hv_melder_link: Link2,
  hv_einladung: Mail,
  hv_direkt: Building2,
  hv_katalog: Building2,
  hv_manuell: Building2,
  org_portal: Building2,
  org_funnel: Building2,
  org_service: Building2,
  sonstiges: Circle,
}

export function KanalBadge({
  kanal,
  className,
}: {
  kanal: LeadKanal | string
  className?: string
}) {
  const Icon = (kanalIcon as Record<string, LucideIcon>)[kanal] ?? Circle
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-bw-border bg-bw-bg px-2 py-0.5 text-xs font-medium text-bw-text',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-bw-light" aria-hidden />
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
        'inline-flex min-h-[28px] items-center rounded-lg bg-status-done-bg px-2 py-0.5 text-xs font-medium text-status-done-text',
        className
      )}
    >
      {children}
    </span>
  )
}
