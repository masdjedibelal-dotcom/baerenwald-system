import { StatusBadge } from '@/components/ui/StatusBadge'
import type { AngebotStatus } from '@/lib/types'

/** @deprecated Leitet auf StatusBadge durch (Phase 1). */
export function AngebotStatusBadge({ status }: { status: AngebotStatus | string }) {
  return <StatusBadge status={status} />
}
