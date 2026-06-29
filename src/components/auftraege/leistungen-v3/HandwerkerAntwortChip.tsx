import type { AuftragPosition } from '@/lib/types'
import {
  handwerkerAntwortAnzeige,
  type HandwerkerAntwortVariant,
} from '@/lib/auftraege/partner-vorgang-display'
import { cn } from '@/lib/utils'

const VARIANT_CLASS: Record<HandwerkerAntwortVariant, string> = {
  angenommen: 'pos-v3-hw-antwort-chip--angenommen',
  abgelehnt: 'pos-v3-hw-antwort-chip--abgelehnt',
  offen: 'pos-v3-hw-antwort-chip--offen',
  nicht_gesendet: 'pos-v3-hw-antwort-chip--nicht-gesendet',
}

export function HandwerkerAntwortChip({
  pos,
  className,
}: {
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>
  className?: string
}) {
  const info = handwerkerAntwortAnzeige(pos)
  if (!info) return null

  return (
    <span
      className={cn('pos-v3-hw-antwort-chip', VARIANT_CLASS[info.variant], className)}
      title="Antwort des Handwerkers auf die Anfrage"
    >
      {info.label}
    </span>
  )
}
