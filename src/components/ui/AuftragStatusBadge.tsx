import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import type { AuftragStatus } from '@/lib/types'

const auftragStatusKind: Record<AuftragStatus, string> = {
  offen: 'neu',
  in_arbeit: 'aktiv',
  abnahme: 'warten',
  abgeschlossen: 'fertig',
  storniert: 'storniert',
}

export function AuftragStatusBadge({ status }: { status: AuftragStatus | string }) {
  const label =
    status in AUFTRAG_STATUS_LABELS
      ? AUFTRAG_STATUS_LABELS[status as AuftragStatus]
      : String(status)
  const kind =
    status in auftragStatusKind ? auftragStatusKind[status as AuftragStatus] : 'plain'
  return <MockBadge kind={kind}>{label}</MockBadge>
}
