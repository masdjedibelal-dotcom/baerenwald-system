'use client'

import { ExternalLink, FileText, StickyNote } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  FREMD_VORGANG_KATEGORIE_LABELS,
  OBJEKT_DOKUMENT_KATEGORIE_LABELS,
} from '@/lib/objektakte/labels'
import type { ObjektAkteReadOnlyPayload } from '@/lib/objektakte/types'
import { formatDatum } from '@/lib/utils'

function formatBetrag(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

type Props = {
  data: ObjektAkteReadOnlyPayload
  /** Kompakter auf Lead-Detail */
  variant?: 'full' | 'compact'
  className?: string
}

export function ObjektAkteReadOnlySection({ data, variant = 'full', className }: Props) {
  const { notizen, dokumente, fremdVorgaenge } = data
  const leer = notizen.length === 0 && dokumente.length === 0 && fremdVorgaenge.length === 0

  if (leer && variant === 'compact') return null

  return (
    <div className={className}>
      <MockCard
        collapsible
        title={
          <>
            <FileText className="inline h-4 w-4 text-bw-primary" aria-hidden /> Objektakte (HV-Portal)
          </>
        }
      >
        <p className="mb-3 text-[12px] leading-relaxed text-bw-text-muted">
          Notizen, Dokumente und Fremd-Vorgänge aus dem Auftraggeber-Portal — nur Anzeige, Bearbeitung im HV-Portal.
        </p>

        {leer ? (
          <p className="text-[13px] text-bw-text-muted">Noch keine Akten-Einträge vom Auftraggeber.</p>
        ) : (
          <div className="space-y-5">
            {notizen.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-bw-text-muted">
                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                  Notizen
                </h3>
                <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
                  {notizen.map((n) => (
                    <li key={n.id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-bw-text-muted">
                          {n.bezug_typ === 'vorgang' ? 'Vorgang' : 'Objekt'}
                        </span>
                        {n.wiedervorlage_am && !n.erledigt_am ? (
                          <StatusBadge status="offer" label={`Wiedervorlage ${formatDatum(n.wiedervorlage_am)}`} />
                        ) : null}
                        {n.erledigt_am ? <StatusBadge status="done" label="Erledigt" /> : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-bw-text">{n.text}</p>
                      <p className="mt-1 text-[11px] text-bw-text-muted">{formatDatum(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {dokumente.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-bw-text-muted">
                  Dokumente
                </h3>
                <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
                  {dokumente.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-bw-text">{d.titel}</p>
                        <p className="text-[12px] text-bw-text-muted">
                          {OBJEKT_DOKUMENT_KATEGORIE_LABELS[d.kategorie] ?? d.kategorie}
                          {d.ablauf_datum ? ` · Ablauf ${formatDatum(d.ablauf_datum)}` : ''}
                        </p>
                      </div>
                      {d.storage_url ? (
                        <a
                          href={d.storage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-[12px] text-bw-link hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Öffnen
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {fremdVorgaenge.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-bw-text-muted">
                  Fremd-Vorgänge
                </h3>
                <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
                  {fremdVorgaenge.map((f) => (
                    <li key={f.id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-bw-text">{f.titel}</span>
                        <StatusBadge status="order" label="extern" />
                      </div>
                      <p className="mt-0.5 text-[12px] text-bw-text-muted">
                        {formatDatum(f.datum)}
                        {f.betrag != null ? ` · ${formatBetrag(f.betrag)}` : ''}
                        {' · '}
                        {FREMD_VORGANG_KATEGORIE_LABELS[f.kategorie] ?? f.kategorie}
                      </p>
                      {f.notiz ? (
                        <p className="mt-1 text-[12px] text-bw-text-muted">{f.notiz}</p>
                      ) : null}
                      {f.dokument_url ? (
                        <a
                          href={f.dokument_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[12px] text-bw-link hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Dokument
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </MockCard>
    </div>
  )
}
