import { cn } from '@/lib/utils'
import { AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import type { AuftragStatus } from '@/lib/types'

const auftragStatusClass: Record<AuftragStatus, string> = {
  offen: 'badge badge-new',
  in_arbeit: 'badge badge-contacted',
  abnahme: 'badge badge-offer',
  abgeschlossen: 'badge badge-done',
  storniert: 'badge badge-cancel',
}

export function AuftragStatusBadge({ status }: { status: AuftragStatus | string }) {
  const label =
    status in AUFTRAG_STATUS_LABELS
      ? AUFTRAG_STATUS_LABELS[status as AuftragStatus]
      : String(status)
  const cls =
    status in auftragStatusClass
      ? auftragStatusClass[status as AuftragStatus]
      : 'badge badge-plain badge-no-dot'
  return <span className={cn(cls)}>{label}</span>
}
