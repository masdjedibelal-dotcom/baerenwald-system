import { cn } from '@/lib/utils'
import {
  ANGEBOT_EINFACH_LABELS,
  type AngebotStatusEinfach,
} from '@/lib/angebot-einfach'

const cls: Record<AngebotStatusEinfach, string> = {
  entwurf: 'badge badge-plain badge-no-dot',
  gesendet: 'badge badge-offer',
  angenommen: 'badge badge-done',
  abgelehnt: 'badge badge-cancel',
  abgelaufen: 'badge badge-contacted',
  ersetzt: 'badge badge-plain badge-no-dot',
}

export function AngebotEinfachStatusBadge({ status }: { status: AngebotStatusEinfach }) {
  return (
    <span className={cn(cls[status] ?? 'badge badge-plain badge-no-dot')}>
      {ANGEBOT_EINFACH_LABELS[status] ?? status}
    </span>
  )
}
