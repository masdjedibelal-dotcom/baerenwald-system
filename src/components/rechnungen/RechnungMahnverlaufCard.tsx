'use client'

import { AlertTriangle, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import {
  aktuelleMahnstufeNummer,
  buildRechnungMahnverlauf,
  naechsteZahlungserinnerungStufe,
  type RechnungMahnKontext,
} from '@/lib/rechnungen/mahnverlauf'
import { formatDatum } from '@/lib/utils'

export type RechnungMahnMailZeile = {
  id: string
  betreff: string
  created_at: string
}

function formatZeitpunkt(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'Noch nicht'
  return formatDatum(iso.slice(0, 10))
}

export function RechnungMahnverlaufCard({
  rechnung,
  mahnMails = [],
  onSendErinnerung,
  onMailAnsehen,
}: {
  rechnung: RechnungMahnKontext & { rechnungsnummer?: string | null }
  mahnMails?: RechnungMahnMailZeile[]
  onSendErinnerung?: (stufe: 1 | 2) => void
  onMailAnsehen?: (emailLogId: string) => void
}) {
  const stufen = buildRechnungMahnverlauf(rechnung)
  const naechste = naechsteZahlungserinnerungStufe(rechnung)
  const aktuelle = aktuelleMahnstufeNummer(rechnung)
  const stufe1Mail = mahnMails[0] ?? null
  const stufe2Mail = mahnMails[1] ?? null

  const timelineItems: TimelineItem[] = stufen.map((s) => {
    const mail =
      s.id === 'stufe1' ? stufe1Mail : s.id === 'stufe2' ? stufe2Mail : null

    return {
      id: s.id,
      text: s.label,
      time: s.sentAt
        ? `Versendet am ${formatZeitpunkt(s.sentAt)}${s.hint ? ` · ${s.hint}` : ''}`
        : s.state === 'active'
          ? `Als Nächstes${s.hint ? ` · ${s.hint}` : ''}`
          : s.hint ?? 'Noch nicht',
      state: s.state === 'skipped' ? 'open' : s.state,
      linkLabel: mail && onMailAnsehen ? 'E-Mail ansehen' : undefined,
      onLinkClick: mail && onMailAnsehen ? () => onMailAnsehen(mail.id) : undefined,
    }
  })

  const statusHint =
    aktuelle === 0
      ? 'Noch keine Mahnung versendet'
      : aktuelle === 3
        ? 'Interne Warnung aktiv'
        : `Aktuelle Mahnstufe ${aktuelle}`

  return (
    <Card collapsible title="Mahnverlauf" defaultOpen>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-bw-text">
              Alle Mahnstufen gehören zur Rechnung{' '}
              <strong>{rechnung.rechnungsnummer?.trim() || '—'}</strong> — es werden keine
              separaten Rechnungen angelegt.
            </p>
            <p className="mt-1 text-xs text-bw-text-muted">{statusHint}</p>
          </div>
          {naechste && onSendErinnerung ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onSendErinnerung(naechste)}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {naechste === 1 ? '1. Erinnerung senden' : '2. Erinnerung senden'}
            </Button>
          ) : null}
        </div>

        <Timeline items={timelineItems} />

        {mahnMails.length > 0 ? (
          <div className="rounded-lg border border-bw-border bg-bw-bg px-3 py-2">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-bw-text-muted">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Versandte Mahn-E-Mails
            </p>
            <ul className="space-y-1.5">
              {mahnMails.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-bw-text">{m.betreff}</span>
                  <span className="shrink-0 text-xs text-bw-text-muted">
                    {formatZeitpunkt(m.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
