'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import type { RechnungListeZeile, RechnungStatus } from '@/lib/types'
import { formatDatum, formatPreis } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
import { cn } from '@/lib/utils'

function kundenName(
  k: RechnungListeZeile['kunden']
): string | null {
  if (!k) return null
  if (Array.isArray(k)) return k[0]?.name ?? null
  return k.name ?? null
}

function statusBadgeClass(s: RechnungStatus, faellig: string | null, bezahlt: string | null) {
  if (s === 'storniert') return 'bg-red-100 text-red-900'
  if (s === 'bezahlt') return 'bg-emerald-100 text-emerald-900'
  if (faellig && !bezahlt) {
    const d = new Date(faellig)
    if (!Number.isNaN(d.getTime()) && d < new Date()) {
      return 'bg-red-200 text-red-950 font-bold'
    }
  }
  if (s === 'gesendet') return 'bg-blue-100 text-blue-900'
  return 'bg-canvas text-muted'
}

export function RechnungenListeClient({ rows }: { rows: RechnungListeZeile[] }) {
  const [status, setStatus] = useState<'' | RechnungStatus>('')

  const filtered = useMemo(() => {
    if (!status) return rows
    return rows.filter((r) => r.status === status)
  }, [rows, status])

  return (
    <div>
      <PageHeader
        title="Rechnungen"
        action={
          <span className="text-sm text-muted">
            Anlage über Auftrag → „Rechnung erstellen“
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={cn(
            'rounded-full px-3 py-1 text-sm',
            status === '' ? 'bg-primary text-white' : 'bg-canvas text-ink'
          )}
        >
          Alle
        </button>
        {(Object.keys(RECHNUNG_STATUS_LABELS) as RechnungStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              status === s ? 'bg-primary text-white' : 'bg-canvas text-ink'
            )}
          >
            {RECHNUNG_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Keine Rechnungen"
          description="Legen Sie eine Rechnung aus einem Auftrag an."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Nr.</th>
                <th className="px-3 py-2 font-medium">Kunde</th>
                <th className="px-3 py-2 font-medium">Brutto</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Fällig</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/rechnungen/${r.id}`} className="font-medium text-primary underline">
                      {r.rechnungsnummer}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{kundenName(r.kunden) ?? '—'}</td>
                  <td className="px-3 py-2">{formatPreis(r.brutto, r.brutto)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs',
                        statusBadgeClass(r.status, r.faellig_am, r.bezahlt_at)
                      )}
                    >
                      {RECHNUNG_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{formatDatum(r.rechnungsdatum)}</td>
                  <td className="px-3 py-2 text-muted">
                    {r.faellig_am ? formatDatum(r.faellig_am) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
