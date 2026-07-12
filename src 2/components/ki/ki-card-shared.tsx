import type { ReactNode } from 'react'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KI_THIN_SAMPLE } from '@/lib/ki/constants'

export type KiCardProps = {
  analyse: KiClusterAnalyseRow
  onGenerateKi?: () => void
  kiLoading?: boolean
}

export function KiCountList({
  title,
  items,
  limit,
}: {
  title: string
  items: { name: string; count: number }[]
  limit?: number
}) {
  const list = limit ? items.slice(0, limit) : items
  if (!list.length) return null
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
      <ul className="space-y-1">
        {list.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-2 text-sm text-bw-text">
            <span className="truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function KiHeroStat({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-bw-border bg-bw-bg px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-bw-text">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  )
}

export function KiThinDataBanner({ sampleSize }: { sampleSize: number }) {
  if (sampleSize >= KI_THIN_SAMPLE) return null
  return (
    <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      Nur {sampleSize} Datenpunkt{sampleSize === 1 ? '' : 'e'} — Aussage noch unsicher. Mehr Aufträge
      und Angebote verbessern die Auswertung.
    </p>
  )
}

export function KiEmptyCardBody({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action?: ReactNode
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium text-bw-text">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function margeClass(marge: number) {
  if (marge >= 20) return 'text-[#2E7D52] bg-[#EAF3DE]'
  if (marge >= 15) return 'text-amber-800 bg-amber-50'
  return 'text-red-800 bg-red-50'
}

export function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
