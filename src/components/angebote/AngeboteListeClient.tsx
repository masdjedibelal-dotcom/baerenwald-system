'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { cn, formatDatum, formatPreis, BEREICH_LABELS } from '@/lib/utils'
import type { Angebot, AngebotPosition, AngebotStatus, Kunde, Lead } from '@/lib/types'

export type AngebotListeEintrag = Omit<Angebot, 'kunden' | 'leads'> & {
  kunden?: Pick<Kunde, 'id' | 'name' | 'email'> | null
  leads?: Pick<Lead, 'id' | 'situation' | 'bereiche'> | null
  positionen: AngebotPosition[]
}

const STATUS_FILTERS: { value: '' | AngebotStatus; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'gesendet_handwerker', label: 'Gesendet Handwerker' },
  { value: 'handwerker_akzeptiert', label: 'Handwerker akzeptiert' },
  { value: 'gesendet_kunde', label: 'Gesendet Kunde' },
  { value: 'kunde_akzeptiert', label: 'Kunde akzeptiert' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
]

function kundenName(a: AngebotListeEintrag) {
  return a.kunden?.name?.trim() || 'Ohne Kunde'
}

export function AngeboteListeClient({ angebote }: { angebote: AngebotListeEintrag[] }) {
  const router = useRouter()
  const [status, setStatus] = useState<'' | AngebotStatus>('')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return angebote.filter((a) => {
      if (status && a.status !== status) return false
      if (!needle) return true
      return kundenName(a).toLowerCase().includes(needle)
    })
  }, [angebote, status, q])

  return (
    <div>
      <PageHeader
        title="Angebote"
        action={
          <Link
            href="/angebote/neu"
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            )}
          >
            <Plus className="h-5 w-5" aria-hidden />
            + Neues Angebot
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <label className="block min-w-0 flex-1 md:max-w-[240px]">
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
        <label className="block min-w-0 flex-1 md:min-w-[220px]">
          <span className="mb-1 block text-sm font-medium text-ink">Suche</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kundenname"
            className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={angebote.length === 0 ? 'Noch keine Angebote' : 'Keine Treffer'}
          description={
            angebote.length === 0
              ? 'Erstellen Sie ein neues Angebot, um es hier zu sehen.'
              : 'Passe Filter oder Suche an.'
          }
          action={
            angebote.length === 0 ? (
              <Link
                href="/angebote/neu"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-white hover:opacity-95"
              >
                + Neues Angebot
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/angebote/${a.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold text-ink">{kundenName(a)}</p>
                      {a.leads?.bereiche?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {a.leads.bereiche.map((b) => (
                            <span
                              key={b}
                              className="rounded-md bg-canvas px-2 py-0.5 text-xs text-muted"
                            >
                              {BEREICH_LABELS[b] ?? b}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-sm text-muted">
                        {formatPreis(a.gesamt_min, a.gesamt_max)}
                      </p>
                      <p className="text-xs text-muted">{formatDatum(a.created_at)}</p>
                    </div>
                    <AngebotStatusBadge status={a.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border bg-surface shadow-card md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-muted">
                  <th className="px-3 py-3 font-medium">Kunde</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Positionen</th>
                  <th className="px-3 py-3 font-medium">Gesamt</th>
                  <th className="px-3 py-3 font-medium">Datum</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/angebote/${a.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/angebote/${a.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <td className="px-3 py-3 font-medium text-ink">{kundenName(a)}</td>
                    <td className="px-3 py-3">
                      <AngebotStatusBadge status={a.status} />
                    </td>
                    <td className="px-3 py-3 text-muted">{a.positionen?.length ?? 0}</td>
                    <td className="px-3 py-3 text-muted">
                      {formatPreis(a.gesamt_min, a.gesamt_max)}
                    </td>
                    <td className="px-3 py-3 text-muted">{formatDatum(a.created_at)}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/angebote/${a.id}`}
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
