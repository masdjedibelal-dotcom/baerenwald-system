import { cn } from '@/lib/utils'
import { ANGEBOT_STATUS_LABELS } from '@/lib/utils'
import type { AngebotStatus } from '@/lib/types'

const styles: Record<AngebotStatus, { bg: string; text: string }> = {
  entwurf: { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]' },
  gesendet_handwerker: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  handwerker_akzeptiert: { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]' },
  gesendet_kunde: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
  kunde_akzeptiert: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
  abgelehnt: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
}

const FALLBACK_STYLE = { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]' }

export function AngebotStatusBadge({ status }: { status: AngebotStatus | string }) {
  const s = status in styles ? styles[status as AngebotStatus] : FALLBACK_STYLE
  const label =
    status in ANGEBOT_STATUS_LABELS
      ? ANGEBOT_STATUS_LABELS[status as AngebotStatus]
      : String(status)
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-lg px-2 py-0.5 text-xs font-medium',
        s.bg,
        s.text
      )}
    >
      {label}
    </span>
  )
}
