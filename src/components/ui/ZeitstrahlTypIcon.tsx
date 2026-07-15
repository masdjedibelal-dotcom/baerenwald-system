import { cn } from '@/lib/utils'
import { resolveMockIcon, type MockIconName } from '@/lib/mock-icons'

const MAP: Record<string, MockIconName> = {
  anfrage: 'inbox',
  angebot: 'file-invoice',
  auftrag: 'tool',
  rechnung: 'receipt',
  notiz: 'messages',
  mail: 'mail',
}

export function ZeitstrahlTypIcon({ typ, className }: { typ: string; className?: string }) {
  const name = MAP[typ]
  if (!name) {
    throw new Error(`Kein Zeitstrahl-Icon für Typ: "${typ}"`)
  }
  const Icon = resolveMockIcon(name)
  return <Icon className={cn('h-5 w-5 shrink-0 text-bw-text-muted', className)} aria-hidden />
}
