'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ANGEBOT_STATUS_LABELS, formatDatum, formatPreis } from '@/lib/utils'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'
import type { AngebotStatus } from '@/lib/types'

type Props = {
  kontext: ProjektKontext
}

function angebotBetrag(a: ProjektKontext['angebote'][0]): string {
  return formatPreis(a.gesamt_fix, a.gesamt_min, a.gesamt_max)
}

export function ProjektUebersichtCard({ kontext }: Props) {
  const { kunde, lead, angebote, auftrag, rechnungen } = kontext
  if (!kunde && !lead && angebote.length === 0 && !auftrag && rechnungen.length === 0) {
    return null
  }

  const rechnungenSumme = rechnungen.reduce((s, r) => s + (r.brutto ?? 0), 0)

  return (
    <Card title="Projektübersicht" collapsible defaultOpen>
      <div className="space-y-3 text-sm">
        {kunde && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-bw-text-muted">Kunde</span>
            <Link href={`/kunden/${kunde.id}`} className="font-medium text-bw-link hover:underline">
              {kunde.name}
            </Link>
          </div>
        )}
        {lead && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-bw-text-muted">Anfrage</span>
            <Link href={`/anfragen/${lead.id}`} className="font-medium text-bw-link hover:underline">
              {lead.label}
            </Link>
          </div>
        )}
        {angebote.length > 0 && (
          <div>
            <p className="mb-1 text-bw-text-muted">Angebote ({angebote.length})</p>
            <ul className="space-y-1">
              {angebote.slice(0, 5).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/angebote/${a.id}`} className="text-bw-link hover:underline">
                    {a.angebotsnr?.trim() || a.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <span className="flex items-center gap-2">
                    <AngebotEinfachStatusBadge
                      status={resolveStatusEinfach({
                        status: a.status as AngebotStatus,
                        status_einfach: a.status_einfach,
                        gueltig_bis: a.gueltig_bis,
                      })}
                    />
                    <span className="tabular-nums">{angebotBetrag(a)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {auftrag && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-bw-text-muted">Auftrag</span>
            <Link href={`/auftraege/${auftrag.id}`} className="font-medium text-bw-link hover:underline">
              {auftrag.titel?.trim() || 'Auftrag'}
            </Link>
          </div>
        )}
        {rechnungen.length > 0 && (
          <div>
            <p className="mb-1 text-bw-text-muted">
              Rechnungen ({rechnungen.length})
              {rechnungenSumme > 0 && (
                <span className="ml-2 tabular-nums">Σ {formatPreis(rechnungenSumme, null, null)}</span>
              )}
            </p>
            <ul className="space-y-1">
              {rechnungen.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/rechnungen/${r.id}`} className="text-bw-link hover:underline">
                    {r.rechnungsnummer}
                  </Link>
                  <span className="flex items-center gap-2">
                    <StatusBadge
                      status="done"
                      label={RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status}
                    />
                    <span className="text-bw-text-muted">{formatDatum(r.rechnungsdatum)}</span>
                    {r.brutto != null && (
                      <span className="tabular-nums">{formatPreis(r.brutto, null, null)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
