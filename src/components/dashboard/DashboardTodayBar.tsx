import Link from 'next/link'
import { AlertCircle, Calendar, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  offeneAnfragen: number
  anfragenUeber48h: number
  termineHeute: number
  offeneTodos: number
}

function TodayChip({
  href,
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  href: string
  icon: typeof Inbox
  label: string
  value: number
  tone?: 'neutral' | 'warn' | 'ok'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl border bg-bw-card px-3 py-2.5 shadow-sm transition-colors hover:bg-bw-hover',
        tone === 'warn' && 'border-amber-200 bg-amber-50/60',
        tone === 'ok' && 'border-bw-border/60',
        tone === 'neutral' && 'border-bw-border/60'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          tone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-bw-hover text-bw-primary'
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold tabular-nums leading-none text-bw-text">{value}</span>
        <span className="mt-0.5 block truncate text-xs text-bw-text-muted">{label}</span>
      </span>
    </Link>
  )
}

export function DashboardTodayBar({
  offeneAnfragen,
  anfragenUeber48h,
  termineHeute,
  offeneTodos,
}: Props) {
  return (
    <section className="space-y-2" aria-label="Aufgaben">
      <h2 className="text-sm font-semibold text-bw-text">Aufgaben</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <TodayChip
          href="/anfragen?status=neu"
          icon={Inbox}
          label="Offene Anfragen"
          value={offeneAnfragen}
          tone={anfragenUeber48h > 0 ? 'warn' : 'ok'}
        />
        <TodayChip
          href="/anfragen?status=neu"
          icon={AlertCircle}
          label=">48h ohne Antwort"
          value={anfragenUeber48h}
          tone={anfragenUeber48h > 0 ? 'warn' : 'neutral'}
        />
        <TodayChip
          href="/kalender"
          icon={Calendar}
          label="Termine heute"
          value={termineHeute}
        />
        <TodayChip
          href="/kalender"
          icon={Calendar}
          label="Offene Termine"
          value={offeneTodos}
        />
      </div>
    </section>
  )
}
