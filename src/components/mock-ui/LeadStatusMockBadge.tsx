'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { STATUS_LABELS } from '@/lib/utils'
import type { LeadStatus } from '@/lib/types'

const LEAD_STATUS_MOCK_KIND: Record<LeadStatus, string> = {
  neu: 'neu',
  kontaktiert: 'warten',
  termin: 'warten',
  angebot: 'aktiv',
  auftrag: 'aktiv',
  abgeschlossen: 'fertig',
  abgebrochen: 'storniert',
}

export function LeadStatusMockBadge({ status }: { status: LeadStatus | string }) {
  const label =
    status in STATUS_LABELS ? STATUS_LABELS[status as LeadStatus] : String(status)
  const kind =
    status in LEAD_STATUS_MOCK_KIND
      ? LEAD_STATUS_MOCK_KIND[status as LeadStatus]
      : 'plain'
  return <MockBadge kind={kind}>{label}</MockBadge>
}
