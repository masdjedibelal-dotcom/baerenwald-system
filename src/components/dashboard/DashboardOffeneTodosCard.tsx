'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LinkChevron } from '@/components/ui/LinkChevron'
import { FilterChips } from '@/components/ui/FilterChips'
import { kalenderTitelZeile } from '@/components/kalender/KalenderTerminZeile'
import { AppEntityListRow } from '@/components/layout/app'
import { DashboardCardPagination } from '@/components/dashboard/DashboardCardPagination'
import { DashboardCardScrollList } from '@/components/dashboard/DashboardCardScrollList'
import { useDashboardListPage } from '@/hooks/useDashboardListPage'
import {
  DASHBOARD_TODO_ZEITRAUM_LABELS,
  countTermineByZeitraum,
  filterTermineByZeitraum,
  type DashboardTodoZeitraum,
} from '@/lib/dashboard-todo-filters'
import { KALENDER_TYP_LABEL, KALENDER_TYP_MARKER } from '@/lib/kalender-styles'
import type { KalenderTermin } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

function todoEyebrow(t: KalenderTermin, zeitraum: DashboardTodoZeitraum): string {
  if (zeitraum === 'heute') {
    return t.uhrzeit_von?.slice(0, 5) ?? 'Ganztägig'
  }
  const zeit = t.uhrzeit_von?.slice(0, 5)
  const datum = formatDatum(t.datum)
  return zeit ? `${datum} · ${zeit}` : datum
}

function todoLine2(t: KalenderTermin): string {
  const parts = [KALENDER_TYP_LABEL[t.typ]]
  if (t.adresse?.trim()) parts.push(t.adresse.trim())
  return parts.join(' · ')
}

function TodoAvatar({ typ }: { typ: KalenderTermin['typ'] }) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor: `${KALENDER_TYP_MARKER[typ]}22` }}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KALENDER_TYP_MARKER[typ] }} />
    </div>
  )
}

export function DashboardOffeneTodosCard({ termine }: { termine: KalenderTermin[] }) {
  const [zeitraum, setZeitraum] = useState<DashboardTodoZeitraum>('heute')

  const counts = useMemo(() => countTermineByZeitraum(termine), [termine])

  const gefiltert = useMemo(
    () => filterTermineByZeitraum(termine, zeitraum),
    [termine, zeitraum]
  )

  const pager = useDashboardListPage(gefiltert, undefined, zeitraum)

  const chipOptions = useMemo(
    () =>
      (['heute', 'diese_woche', 'dieser_monat'] as const).map((z) => ({
        value: z,
        label: DASHBOARD_TODO_ZEITRAUM_LABELS[z],
        count: counts[z],
      })),
    [counts]
  )

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-bw-text-muted" aria-hidden />
          Termine
        </span>
      }
      action={
        <Link href="/kalender" className="text-xs font-medium text-bw-link hover:underline">
          <LinkChevron>Kalender</LinkChevron>
        </Link>
      }
      bodyClassName="p-0"
    >
      <div className="border-b border-bw-border px-4 py-3">
        <FilterChips
          options={chipOptions}
          selected={[zeitraum]}
          onChange={(vals) => {
            const next = vals[0] as DashboardTodoZeitraum | undefined
            if (next) setZeitraum(next)
          }}
        />
      </div>

      {pager.total === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">
          Keine Termine für {DASHBOARD_TODO_ZEITRAUM_LABELS[zeitraum].toLowerCase()}.
        </p>
      ) : (
        <>
          <DashboardCardScrollList>
            {pager.pageItems.map((t) => (
              <AppEntityListRow
                key={t.id}
                href="/kalender"
                avatar={<TodoAvatar typ={t.typ} />}
                eyebrow={todoEyebrow(t, zeitraum)}
                title={kalenderTitelZeile(t)}
                line2={todoLine2(t)}
              />
            ))}
          </DashboardCardScrollList>
          <DashboardCardPagination
            rangeFrom={pager.rangeFrom}
            rangeTo={pager.rangeTo}
            total={pager.total}
            pageIndex={pager.pageIndex}
            totalPages={pager.totalPages}
            onPrev={pager.goPrev}
            onNext={pager.goNext}
          />
        </>
      )}
    </Card>
  )
}
