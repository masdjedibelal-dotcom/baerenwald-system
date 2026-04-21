import { cn } from '@/lib/utils'
import { AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import type { AuftragStatus } from '@/lib/types'

const styles: Record<AuftragStatus, { bg: string; text: string }> = {
  offen: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  in_arbeit: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  abnahme: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
  abgeschlossen: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
  storniert: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
}

const FALLBACK_STYLE = { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]' }

export function AuftragStatusBadge({ status }: { status: AuftragStatus | string }) {
  const s = status in styles ? styles[status as AuftragStatus] : FALLBACK_STYLE
  const label =
    status in AUFTRAG_STATUS_LABELS
      ? AUFTRAG_STATUS_LABELS[status as AuftragStatus]
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
