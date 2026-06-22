import Link from 'next/link'
import { ChevronRight, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatDelta = {
  /** z. B. „+18 % vs. Vormonat“ */
  label: string
  trend: 'up' | 'down' | 'neutral'
  /** Bei Warn-KPIs (z. B. überfällige Rechnungen): Rückgang = positiv (grün). */
  invertTrendColors?: boolean
  /** z. B. „+18 %“ — kompakte Inline-Anzeige (Mobile) */
  percentPart?: string
  /** z. B. „vs. Vorwoche“ */
  suffixPart?: string
}

interface StatCardProps {
  zahl: number
  label: string
  icon?: LucideIcon
  href: string
  farbe: 'blau' | 'orange' | 'gruen' | 'lila' | 'rot'
  /** Linker Farbbalken bei Warnung (z. B. neue Anfragen / überfällige Rechnungen). */
  warnung?: boolean
  delta?: StatDelta
  /** Zweite Zeile, z. B. Monatsvergleich unter der Wochen-KPI */
  subDelta?: StatDelta & { prefix?: string }
  /** Kompakt: Delta rot inline neben der Zahl; minimal: nur Label + Zahl */
  layout?: 'default' | 'compact' | 'minimal'
}

const FARBEN = {
  blau: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    balken: 'bg-blue-500',
  },
  orange: {
    icon: 'text-orange-500',
    bg: 'bg-orange-50',
    balken: 'bg-orange-500',
  },
  gruen: {
    icon: 'text-bw-primary',
    bg: 'bg-bw-green-bg',
    balken: 'bg-bw-primary',
  },
  lila: {
    icon: 'text-purple-500',
    bg: 'bg-purple-50',
    balken: 'bg-purple-500',
  },
  rot: {
    icon: 'text-red-500',
    bg: 'bg-red-50',
    balken: 'bg-red-500',
  },
} as const

function deltaColor(d: StatDelta): string {
  if (d.trend === 'neutral') return 'text-bw-text-muted'
  const positive = d.trend === 'up'
  const good = d.invertTrendColors ? !positive : positive
  return good ? 'text-bw-primary' : 'text-status-cancel-text'
}

function DeltaTrendIcon({ trend }: { trend: StatDelta['trend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
  return <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
}

function DeltaLine({ delta, className }: { delta: StatDelta; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', deltaColor(delta), className)}>
      <DeltaTrendIcon trend={delta.trend} />
      <span>{delta.label}</span>
    </span>
  )
}

function InlineCompactDelta({ delta }: { delta: StatDelta }) {
  const mobile = delta.percentPart ?? delta.label
  const desktop =
    delta.percentPart && delta.suffixPart
      ? `${delta.percentPart} ${delta.suffixPart}`
      : delta.label

  return (
    <span className="text-[11px] font-semibold tabular-nums text-red-500 sm:text-xs" aria-label={delta.label}>
      <span className="sm:hidden">{mobile}</span>
      <span className="hidden sm:inline">{desktop}</span>
    </span>
  )
}

export function StatCard({
  zahl,
  label,
  icon: Icon,
  href,
  farbe,
  warnung = false,
  delta,
  subDelta,
  layout = 'default',
}: StatCardProps) {
  const f = FARBEN[farbe]
  const zeigBalken = warnung && zahl > 0
  const isCompact = layout === 'compact'
  const isMinimal = layout === 'minimal'
  const showDecorIcon = Boolean(Icon) && !isMinimal

  return (
    <Link href={href} className="block h-full">
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-lg border border-bw-border bg-bw-card',
          isCompact || isMinimal ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4',
          'cursor-pointer transition-all duration-150 hover:border-bw-primary hover:shadow-md'
        )}
      >
        {zeigBalken ? <div className={cn('absolute bottom-0 left-0 top-0 w-1', f.balken)} /> : null}

        {showDecorIcon && Icon ? (
          <Icon
            className={cn('pointer-events-none absolute -bottom-3 -right-3 h-[60px] w-[60px]', f.icon, 'opacity-10')}
            aria-hidden
          />
        ) : null}

        <div className="relative min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-bw-text-muted sm:text-[11px]">
            {label}
          </p>

          {isCompact ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-xl font-semibold leading-none tabular-nums text-bw-text sm:text-2xl">
                {zahl}
              </span>
              {delta ? <InlineCompactDelta delta={delta} /> : null}
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'mt-1 font-semibold leading-none tabular-nums text-bw-text',
                  isMinimal ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
                )}
              >
                {zahl}
              </p>
              {delta ? (
                <p className="mt-1.5 text-xs font-medium">
                  <DeltaLine delta={delta} />
                </p>
              ) : !isMinimal ? (
                <ChevronRight className="mt-1.5 h-4 w-4 text-bw-light" aria-hidden />
              ) : null}
              {subDelta ? (
                <p className="mt-1 text-[11px] font-medium text-bw-text-muted">
                  {subDelta.prefix ? <span>{subDelta.prefix}</span> : null}
                  <DeltaLine delta={subDelta} className="text-[11px]" />
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
