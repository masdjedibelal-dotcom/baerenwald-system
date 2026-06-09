import Link from 'next/link'
import { AlertCircle, Calendar, Inbox, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  offeneAnfragen: number
  anfragenUeber24h: number
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
  anfragenUeber24h,
  termineHeute,
  offeneTodos,
}: Props) {
  return (
    <section className="space-y-2" aria-label="Heute">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-bw-text">Heute</h2>
        <Link
          href="/ki-analytics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E7D52]/25 bg-[#EAF3DE]/80 px-2.5 py-1 text-xs font-medium text-[#1A3D2B] hover:bg-[#EAF3DE]"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          KI Hub
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <TodayChip
          href="/anfragen"
          icon={Inbox}
          label="Offene Anfragen"
          value={offeneAnfragen}
          tone={anfragenUeber24h > 0 ? 'warn' : 'ok'}
        />
        <TodayChip
          href="/anfragen?status=neu"
          icon={AlertCircle}
          label=">24h ohne Antwort"
          value={anfragenUeber24h}
          tone={anfragenUeber24h > 0 ? 'warn' : 'neutral'}
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
          label="Offene To-dos"
          value={offeneTodos}
        />
      </div>
    </section>
  )
}
