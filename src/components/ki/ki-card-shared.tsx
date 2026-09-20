import type { ReactNode } from 'react'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KI_THIN_SAMPLE } from '@/lib/ki/constants'
import { formatEuro } from '@/lib/format/geld-datum'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'

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
    <div className="rounded-card border border-bw-border bg-bw-bg px-3 py-2.5">
      <p className="text-fs-caption font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-bw-text">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  )
}

export function KiThinDataBanner({ sampleSize }: { sampleSize: number }) {
  if (sampleSize >= KI_THIN_SAMPLE) return null
  return (
    <p className="border-b border-status-contact-bg bg-status-contact-bg px-4 py-2 text-xs text-status-contact-text">
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
  return <MockEmpty title={title} hint={hint} action={action} />
}

export function margeClass(marge: number) {
  if (marge >= 20) return 'text-bw-primary bg-bw-green-bg'
  if (marge >= 15) return 'text-status-contact-text bg-status-contact-bg'
  return 'text-status-cancel-text bg-status-cancel-bg'
}

export function formatEur(value: number) {
  return formatEuro(value, { style: 'currency' })
}
