'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { formatDatum } from '@/lib/utils'
import type { AuftragListeEintrag, AuftragStatus } from '@/lib/types'

const STATUS_FILTERS: { value: '' | AuftragStatus; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'offen', label: 'Offen' },
  { value: 'in_arbeit', label: 'In Arbeit' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'storniert', label: 'Storniert' },
]

function kundenName(a: AuftragListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

function gewerkeTags(a: AuftragListeEintrag) {
  const names = new Set<string>()
  for (const z of a.auftrag_handwerker ?? []) {
    if (z.gewerke?.name) names.add(z.gewerke.name)
  }
  return Array.from(names)
}

function handwerkerNamen(a: AuftragListeEintrag) {
  const names = (a.auftrag_handwerker ?? [])
    .map((z) => z.handwerker?.name)
    .filter(Boolean) as string[]
  return names.length ? names.join(', ') : '—'
}

export function AuftraegeListeClient({ auftraege }: { auftraege: AuftragListeEintrag[] }) {
  const router = useRouter()
  const [status, setStatus] = useState<'' | AuftragStatus>('')

  const filtered = useMemo(() => {
    return auftraege.filter((a) => {
      if (status && a.status !== status) return false
      return true
    })
  }, [auftraege, status])

  return (
    <div>
      <PageHeader title="Aufträge" />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <label className="block min-w-0 flex-1 md:max-w-[220px]">
          <span className="mb-1 block text-sm font-medium text-ink">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_FILTERS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={auftraege.length === 0 ? 'Keine Aufträge' : 'Keine Treffer'}
          description={
            auftraege.length === 0
              ? 'Aufträge aus angenommenen Angeboten erscheinen hier.'
              : 'Filter anpassen.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/auftraege/${a.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold text-ink">{kundenName(a)}</p>
                      {gewerkeTags(a).length ? (
                        <div className="flex flex-wrap gap-1">
                          {gewerkeTags(a).map((g) => (
                            <span
                              key={g}
                              className="rounded-md bg-canvas px-2 py-0.5 text-xs text-muted"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {a.start_datum ? (
                        <p className="text-xs text-muted">Start: {formatDatum(a.start_datum)}</p>
                      ) : null}
                      <p className="text-sm text-muted">{handwerkerNamen(a)}</p>
                    </div>
                    <AuftragStatusBadge status={a.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border bg-surface shadow-card md:block">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-muted">
                  <th className="px-3 py-3 font-medium">Kunde</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Gewerke</th>
                  <th className="px-3 py-3 font-medium">Handwerker</th>
                  <th className="px-3 py-3 font-medium">Start</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/auftraege/${a.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/auftraege/${a.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <td className="px-3 py-3 font-medium text-ink">{kundenName(a)}</td>
                    <td className="px-3 py-3">
                      <AuftragStatusBadge status={a.status} />
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-muted">
                      {gewerkeTags(a).length ? gewerkeTags(a).join(', ') : '—'}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-muted">{handwerkerNamen(a)}</td>
                    <td className="px-3 py-3 text-muted">
                      {a.start_datum ? formatDatum(a.start_datum) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/auftraege/${a.id}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Öffnen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
