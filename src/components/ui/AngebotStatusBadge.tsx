import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { ANGEBOT_STATUS_LABELS } from '@/lib/utils'
import type { AngebotStatus } from '@/lib/types'

const angebotStatusKind: Record<AngebotStatus, string> = {
  entwurf: 'plain',
  gesendet_handwerker: 'neu',
  handwerker_akzeptiert: 'warten',
  gesendet_kunde: 'warten',
  kunde_akzeptiert: 'fertig',
  abgelehnt: 'storniert',
}

export function AngebotStatusBadge({ status }: { status: AngebotStatus | string }) {
  const label =
    status in ANGEBOT_STATUS_LABELS
      ? ANGEBOT_STATUS_LABELS[status as AngebotStatus]
      : String(status)
  const kind =
    status in angebotStatusKind ? angebotStatusKind[status as AngebotStatus] : 'plain'
  return <MockBadge kind={kind}>{label}</MockBadge>
}
