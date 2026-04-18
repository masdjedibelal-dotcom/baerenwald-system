'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { KanalBadge, LeadStatusBadge } from '@/components/ui/Badge'
import { cn, formatDatum, formatPreis, BEREICH_LABELS } from '@/lib/utils'
import type { Lead, LeadKanal, LeadStatus } from '@/lib/types'

const STATUS_FILTERS: { value: '' | LeadStatus; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'neu', label: 'Neu' },
  { value: 'kontaktiert', label: 'Kontaktiert' },
  { value: 'angebot', label: 'Angebot' },
  { value: 'auftrag', label: 'Auftrag' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'abgebrochen', label: 'Abgebrochen' },
]

const KANAL_FILTERS: { value: '' | LeadKanal; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'website', label: 'Website' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-Mail' },
  { value: 'vor_ort', label: 'Vor Ort' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

function leadName(lead: Lead) {
  const k = lead.kunden
  if (k && 'name' in k && k.name) return k.name
  return lead.kontakt_name ?? 'Ohne Namen'
}

function leadEmail(lead: Lead) {
  const k = lead.kunden
  if (k && 'email' in k && k.email) return k.email
  return lead.kontakt_email ?? ''
}

export function AnfragenListeClient({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [status, setStatus] = useState<'' | LeadStatus>('')
  const [kanal, setKanal] = useState<'' | LeadKanal>('')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (status && l.status !== status) return false
      if (kanal && l.kanal !== kanal) return false
      if (!needle) return true
      const name = leadName(l).toLowerCase()
      const mail = leadEmail(l).toLowerCase()
      return name.includes(needle) || mail.includes(needle)
    })
  }, [leads, status, kanal, q])

  return (
    <div>
      <PageHeader
        title="Anfragen"
        action={
          <Link
            href="/anfragen/neu"
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            )}
          >
            <Plus className="h-5 w-5" aria-hidden />
            + Neue Anfrage
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <label className="block min-w-0 flex-1 md:max-w-[200px]">
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
        <label className="block min-w-0 flex-1 md:max-w-[200px]">
          <span className="mb-1 block text-sm font-medium text-ink">Kanal</span>
          <select
            value={kanal}
            onChange={(e) => setKanal(e.target.value as typeof kanal)}
            className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {KANAL_FILTERS.map((o) => (
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
            placeholder="Name oder E-Mail"
            className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={leads.length === 0 ? 'Noch keine Anfragen' : 'Keine Treffer'}
          description={
            leads.length === 0
              ? 'Lege die erste Anfrage an, um sie hier zu sehen.'
              : 'Passe Filter oder Suche an.'
          }
          action={
            leads.length === 0 ? (
              <Link
                href="/anfragen/neu"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-white hover:opacity-95"
              >
                + Erste Anfrage erstellen
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/anfragen/${lead.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold text-ink">
                        {leadName(lead)}
                      </p>
                      <KanalBadge kanal={lead.kanal} />
                      {lead.bereiche?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.bereiche.map((b) => (
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
                        {formatPreis(lead.preis_min, lead.preis_max)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDatum(lead.created_at)}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border bg-surface shadow-card md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-muted">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Kanal</th>
                  <th className="px-3 py-3 font-medium">Bereiche</th>
                  <th className="px-3 py-3 font-medium">Preis</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Datum</th>
                  <th className="px-3 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/anfragen/${lead.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/anfragen/${lead.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <td className="px-3 py-3 font-medium text-ink">
                      {leadName(lead)}
                    </td>
                    <td className="px-3 py-3">
                      <KanalBadge kanal={lead.kanal} className="border-0 bg-transparent p-0" />
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-muted">
                      {lead.bereiche?.length
                        ? lead.bereiche
                            .map((b) => BEREICH_LABELS[b] ?? b)
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {formatPreis(lead.preis_min, lead.preis_max)}
                    </td>
                    <td className="px-3 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {formatDatum(lead.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/anfragen/${lead.id}`}
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
