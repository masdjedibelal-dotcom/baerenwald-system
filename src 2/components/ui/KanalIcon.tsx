import {
  Circle,
  Globe,
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
