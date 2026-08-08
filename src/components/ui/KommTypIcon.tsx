import { Calendar, Mail, Phone, StickyNote, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KommTyp = 'mail' | 'note' | 'call' | 'calendar'

const MAP: Record<KommTyp, LucideIcon> = {
  mail: Mail,
  note: StickyNote,
  call: Phone,
  calendar: Calendar,
}

export function KommTypIcon({ typ, className }: { typ: KommTyp; className?: string }) {
  const Icon = MAP[typ]
  return <Icon className={cn('inline h-3.5 w-3.5 shrink-0 text-bw-text-muted', className)} aria-hidden />
}
