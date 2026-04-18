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

export function AuftragStatusBadge({ status }: { status: AuftragStatus }) {
  const s = styles[status]
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-lg px-2 py-0.5 text-xs font-medium',
        s.bg,
        s.text
      )}
    >
      {AUFTRAG_STATUS_LABELS[status]}
    </span>
  )
}
