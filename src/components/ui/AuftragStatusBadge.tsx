import { StatusBadge } from '@/components/ui/StatusBadge'
import type { AuftragStatus } from '@/lib/types'

/** @deprecated Leitet auf StatusBadge durch (Phase 1). */
export function AuftragStatusBadge({ status }: { status: AuftragStatus | string }) {
  return <StatusBadge status={status} />
}
