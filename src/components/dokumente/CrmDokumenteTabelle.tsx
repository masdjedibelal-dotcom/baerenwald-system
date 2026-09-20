'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEmpty, MockTable } from '@/components/mock-ui'
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
    return <MockEmpty icon="file-text" title={emptyTitle} hint={emptyDescription} />
  }

  return (
    <MockTable wrapClassName="dok-table-wrap" className="dok-table">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-bw-border bg-surface text-[var(--red-tx)] transition-colors hover:bg-[var(--red-bg)]"
                aria-label={`${row.name} öffnen`}
              >
                <MockIcon n="file-text" ctx="default" className="h-4 w-4" aria-hidden />
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </MockTable>
  )
}
