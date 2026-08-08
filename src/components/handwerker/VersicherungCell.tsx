import { Shield } from 'lucide-react'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { VersicherungStatus } from '@/lib/handwerker-versicherung'

export function VersicherungCell({
  gueltig_bis,
  status,
}: {
  gueltig_bis: string | null
  status: VersicherungStatus
}) {
  const iconCls = {
    ok: 'text-bw-primary',
    warn: 'text-amber-600',
    expired: 'text-status-cancel-text',
    missing: 'text-bw-text-muted opacity-50',
  }[status]

  const label =
    status === 'missing' ? 'Fehlt' : gueltig_bis ? formatDatum(gueltig_bis) : hasNachweisLabel(status)

  return (
    <div className="flex items-center gap-1.5" title="Betriebshaftpflichtversicherung">
      <Shield className={cn('h-4 w-4 shrink-0', iconCls)} aria-hidden />
      <span
        className={cn(
          'text-xs tabular-nums',
          status === 'expired' && 'font-medium text-status-cancel-text',
          status === 'warn' && 'font-medium text-amber-700'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function hasNachweisLabel(status: VersicherungStatus): string {
  if (status === 'ok' || status === 'warn') return 'Gültig'
  return '—'
}
