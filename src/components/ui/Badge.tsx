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

const leadStatusStyles: Record<
  LeadStatus,
  { bg: string; text: string }
> = {
  neu: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  kontaktiert: {
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
  },
  angebot: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
  auftrag: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
  abgeschlossen: {
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#374151]',
  },
  abgebrochen: {
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
  },
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
        'inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-border bg-canvas px-2 py-0.5 text-xs font-medium text-ink',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
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
        'inline-flex min-h-[28px] items-center rounded-lg bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#374151]',
        className
      )}
    >
      {children}
    </span>
  )
}
