'use client'

import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { formatDatum } from '@/lib/utils'

export type CrmDokumentZeile = {
  id: string
  datum?: string | null
  name: string
  href: string
}

export function CrmDokumenteTabelle({
  zeilen,
  emptyTitle = 'Noch keine Dokumente',
  emptyDescription = 'Hier erscheinen Angebote, Rechnungen und weitere PDFs.',
}: {
  zeilen: CrmDokumentZeile[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (!zeilen.length) {
    return (
      <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />
    )
  }

  return (
    <div className="dok-table-wrap">
      <table className="dok-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Dateiname</th>
            <th className="text-right w-14" aria-label="PDF öffnen" />
          </tr>
        </thead>
        <tbody>
          {zeilen.map((row) => (
            <tr key={row.id}>
              <td className="tabular-nums text-bw-text-muted whitespace-nowrap">
                {row.datum ? formatDatum(row.datum) : '—'}
              </td>
              <td className="font-medium text-bw-text max-w-[min(100%,28rem)]">
                <span className="line-clamp-2">{row.name}</span>
              </td>
              <td className="text-right">
                <a
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-[#c62828] transition-colors hover:bg-red-50"
                  aria-label={`${row.name} öffnen`}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
