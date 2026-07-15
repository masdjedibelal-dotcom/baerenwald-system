'use client'

import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatDatum, formatPreis } from '@/lib/utils'

export type AuftragRechnungZeile = {
  id: string
  rechnungsnummer: string | null
  status: string
  brutto: number | null
  rechnungsdatum: string | null
  faellig_am: string | null
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
  ueberfaellig: 'Überfällig',
  storniert: 'Storniert',
}

export function AuftragRechnungenSection({
  auftragId,
  kundeId,
  rechnungen,
  hatPositionen,
}: {
  auftragId: string
  kundeId: string | null
  rechnungen: AuftragRechnungZeile[]
  hatPositionen: boolean
}) {
  const neuHref =
    kundeId && hatPositionen ? `/rechnungen/neu?auftrag_id=${auftragId}` : null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-bw-text">
          Rechnungen {rechnungen.length > 0 ? `· ${rechnungen.length}` : ''}
        </h2>
        {neuHref ? (
          <Link href={neuHref} className="btn btn-primary btn-sm inline-flex gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Rechnung erstellen
          </Link>
        ) : null}
      </div>

      {rechnungen.length === 0 ? (
        <p className="text-sm text-bw-text-muted">
          {hatPositionen
            ? 'Noch keine Rechnungen zu diesem Auftrag.'
            : 'Zuerst Positionen anlegen, dann Rechnung erstellen.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rechnungen.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <Receipt className="h-4 w-4 shrink-0 text-bw-primary" aria-hidden />
                <div>
                  <Link href={`/rechnungen/${r.id}`} className="font-medium text-bw-link">
                    Rechnung
                    {r.rechnungsdatum ? ` · ${formatDatum(r.rechnungsdatum)}` : ''}
                  </Link>
                  <p className="text-xs text-bw-text-muted">
                    {STATUS_LABEL[r.status] ?? r.status}
                    {r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}
                  </p>
                </div>
              </div>
              <span className="font-semibold tabular-nums text-bw-text">
                {formatPreis(r.brutto, null, null)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
