import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import {
  ANGEBOT_EINFACH_LABELS,
  type AngebotStatusEinfach,
} from '@/lib/angebot-einfach'

const kindByStatus: Record<AngebotStatusEinfach, string> = {
  entwurf: 'plain',
  gesendet: 'warten',
  angenommen: 'fertig',
  abgelehnt: 'storniert',
  abgelaufen: 'warten',
  ersetzt: 'plain',
}

export function AngebotEinfachStatusBadge({ status }: { status: AngebotStatusEinfach }) {
  return (
    <MockBadge kind={kindByStatus[status] ?? 'plain'}>
      {ANGEBOT_EINFACH_LABELS[status] ?? status}
    </MockBadge>
  )
}
