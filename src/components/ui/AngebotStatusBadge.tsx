import { cn } from '@/lib/utils'
import { ANGEBOT_STATUS_LABELS } from '@/lib/utils'
import type { AngebotStatus } from '@/lib/types'

const angebotStatusClass: Record<AngebotStatus, string> = {
  entwurf: 'badge badge-plain badge-no-dot',
  gesendet_handwerker: 'badge badge-new',
  handwerker_akzeptiert: 'badge badge-contacted',
  gesendet_kunde: 'badge badge-offer',
  kunde_akzeptiert: 'badge badge-done',
  abgelehnt: 'badge badge-cancel',
}

export function AngebotStatusBadge({ status }: { status: AngebotStatus | string }) {
  const label =
    status in ANGEBOT_STATUS_LABELS
      ? ANGEBOT_STATUS_LABELS[status as AngebotStatus]
      : String(status)
  const cls =
    status in angebotStatusClass
      ? angebotStatusClass[status as AngebotStatus]
      : 'badge badge-plain badge-no-dot'
  return <span className={cn(cls)}>{label}</span>
}
