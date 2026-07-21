import {
  Building2,
  Circle,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadKanal } from '@/lib/types'

const KANAL_MAP: Record<LeadKanal | string, LucideIcon> = {
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

export function KanalIcon({
  kanal,
  className,
}: {
  kanal: string
  className?: string
}) {
  const Icon = KANAL_MAP[kanal] ?? Circle
  return <Icon className={cn('h-4 w-4 shrink-0 text-bw-text-muted', className)} aria-hidden />
}
