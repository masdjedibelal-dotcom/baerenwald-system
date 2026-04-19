import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react'
import { cn, KANAL_LABELS, STATUS_LABELS } from '@/lib/utils'
import type { LeadKanal, LeadStatus } from '@/lib/types'

const leadStatusStyles: Record<LeadStatus, { bg: string; text: string }> = {
  neu: { bg: 'bg-status-new-bg', text: 'text-status-new-text' },
  kontaktiert: { bg: 'bg-status-contact-bg', text: 'text-status-contact-text' },
  angebot: { bg: 'bg-status-offer-bg', text: 'text-status-offer-text' },
  auftrag: { bg: 'bg-status-order-bg', text: 'text-status-order-text' },
  abgeschlossen: { bg: 'bg-status-done-bg', text: 'text-status-done-text' },
  abgebrochen: { bg: 'bg-status-cancel-bg', text: 'text-status-cancel-text' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const s = leadStatusStyles[status]
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-lg px-2 py-0.5 text-xs font-medium',
        s.bg,
        s.text
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const kanalIcon: Record<LeadKanal, LucideIcon> = {
  website: Globe,
  telefon: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  vor_ort: MapPin,
  sonstiges: Circle,
}

export function KanalBadge({
  kanal,
  className,
}: {
  kanal: LeadKanal
  className?: string
}) {
  const Icon = kanalIcon[kanal]
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-bw-border bg-bw-bg px-2 py-0.5 text-xs font-medium text-bw-text',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-bw-light" aria-hidden />
      <span>{KANAL_LABELS[kanal]}</span>
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
