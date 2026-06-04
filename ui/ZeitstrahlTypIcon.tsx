import {
  FileText,
  Hammer,
  Inbox,
  Mail,
  Receipt,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MAP: Record<string, LucideIcon> = {
  anfrage: Inbox,
  angebot: FileText,
  auftrag: Hammer,
  rechnung: Receipt,
  notiz: StickyNote,
  mail: Mail,
}

export function ZeitstrahlTypIcon({ typ, className }: { typ: string; className?: string }) {
  const Icon = MAP[typ] ?? FileText
  return <Icon className={cn('h-5 w-5 shrink-0 text-bw-text-muted', className)} aria-hidden />
}
