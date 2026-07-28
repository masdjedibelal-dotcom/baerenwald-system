'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export type MyWorkItem = {
  id: string
  label: string
  hint: string
  href: string
  icon: string
  /** Live-Count aus Dashboard-KPIs (optional) */
  count?: number
}

const FALLBACK_TAG: MyWorkItem[] = [
  {
    id: 'au',
    label: 'Laufende Aufträge',
    hint: 'Arbeit & Abnahme',
    href: '/vorgaenge?tab=auftrag&lifecycle=offen',
    icon: 'briefcase',
  },
  {
    id: 're',
    label: 'RE überfällig',
    hint: 'Mahnung prüfen',
    href: '/vorgaenge?tab=rechnung&lifecycle=offen',
    icon: 'receipt',
  },
]

const FALLBACK_WAITING: MyWorkItem[] = [
  {
    id: 'ag-warten',
    label: 'Angebote gesendet',
    hint: 'Antwort ausstehend',
    href: '/vorgaenge?tab=angebot&lifecycle=offen',
    icon: 'file-invoice',
  },
]

function WorkList({ rows }: { rows: MyWorkItem[] }) {
  return (
    <ul className="m-0 list-none divide-y divide-bw-border p-0">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={r.href}
            className="flex items-center gap-3 px-4 py-3 text-left no-underline hover:bg-bw-surface-2"
          >
            <MockIcon ctx="nav" n={r.icon} size={18} />
            <span className="min-w-0 flex-1">
              <span className="block text-[length:var(--fs-text)] font-medium text-bw-text">{r.label}</span>
              <span className="block text-[length:var(--fs-meta)] text-bw-text-muted">{r.hint}</span>
            </span>
            {typeof r.count === 'number' ? (
              <span
                className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-bw-surface-2 px-2 py-0.5 text-[length:var(--fs-meta)] font-semibold tabular-nums text-bw-text"
                aria-label={`${r.count} offen`}
              >
                {r.count}
              </span>
            ) : null}
            <span className="text-bw-text-muted" aria-hidden>
              ›
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Tages-Inbox / My Work (W2-01 / W2-02) — Mein Tag + Warten auf Kunde.
 */
export function MyWorkInbox({
  tagItems,
  waitingItems,
  /** @deprecated Nutze tagItems + waitingItems */
  items,
  className,
}: {
  tagItems?: MyWorkItem[]
  waitingItems?: MyWorkItem[]
  items?: MyWorkItem[]
  className?: string
}) {
  const legacy = items?.length ? items : null
  const tag = tagItems ?? legacy ?? FALLBACK_TAG
  const waiting = waitingItems ?? (legacy ? [] : FALLBACK_WAITING)
  const allCountsZero = [...tag, ...waiting].every((r) => (r.count ?? 0) === 0)

  return (
    <div className={className ?? 'card'}>
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="checklist" size={16} />
          Meine Arbeit
        </div>
      </div>
      {allCountsZero ? (
        <div className="border-b border-bw-border px-4 py-4 text-center">
          <p className="text-[length:var(--fs-text)] font-medium text-bw-text">Alles erledigt — guter Start in den Tag.</p>
          <p className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted">
            Unten findest du Sprungmarken zu Vorgängen. Neue Anfrage: + in der Nav.
          </p>
        </div>
      ) : null}
      <div className="card-b !p-0">
        <WorkList rows={tag} />
      </div>
      {waiting.length > 0 ? (
        <>
          <div className="border-t border-bw-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-[length:var(--fs-text)] font-medium text-bw-text-muted">
              <MockIcon ctx="nav" n="hourglass" size={14} />
              Warten auf Kunde
            </div>
          </div>
          <div className="card-b !p-0 !pt-0">
            <WorkList rows={waiting} />
          </div>
        </>
      ) : null}
    </div>
  )
}
