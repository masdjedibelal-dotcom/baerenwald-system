import type { AuftragPosition } from '@/lib/types'
import {
  partnerVorgangAnzeige,
  type PartnerVorgangChipVariant,
} from '@/lib/auftraege/partner-vorgang-display'
import { cn } from '@/lib/utils'

const VARIANT_CLASS: Record<PartnerVorgangChipVariant, string> = {
  entfernt: 'pos-v3-vorgang-chip--entfernt',
  geaendert: 'pos-v3-vorgang-chip--geaendert',
  neu: 'pos-v3-vorgang-chip--neu',
  gesendet: 'pos-v3-vorgang-chip--gesendet',
}

export function PartnerVorgangChip({
  pos,
  className,
}: {
  pos: Pick<AuftragPosition, 'aenderung_typ' | 'handwerker_status' | 'handwerker_id'>
  className?: string
}) {
  const info = partnerVorgangAnzeige(pos)
  if (!info) return null

  return (
    <span
      className={cn('pos-v3-vorgang-chip', VARIANT_CLASS[info.variant], className)}
      title="Status im Partner-Portal (Tab Vorgänge)"
    >
      {info.label}
    </span>
  )
}
