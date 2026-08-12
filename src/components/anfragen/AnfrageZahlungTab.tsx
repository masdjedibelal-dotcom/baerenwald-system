'use client'

import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { formatDatum } from '@/lib/utils'
import type { ProjektRechnungKurz } from '@/lib/crm/projekt-kontext-types'
import type { StatusTone } from '@/lib/status/status-tone'

/**
 * Anfrage · Zahlung-Tab — drei Zustände Spec §9 / N4:
 * leer · geplant (Entwurf) · vorhanden (gestellt/bezahlt).
 */
export function AnfrageZahlungTab({
  rechnungen,
}: {
  rechnungen: ProjektRechnungKurz[]
}) {
  const aktiv = rechnungen.filter((r) => String(r.status).toLowerCase() !== 'storniert')
  const geplant = aktiv.filter((r) => String(r.status).toLowerCase() === 'entwurf')
  const vorhanden = aktiv.filter((r) => String(r.status).toLowerCase() !== 'entwurf')

  if (aktiv.length === 0) {
    return (
      <MockCard title="Zahlung" icon="calculator" className="zahlplan-shell">
        <div className="zahlplan-empty">
          <MockIcon ctx="empty" n="calculator" size={26} />
          <div className="zahlplan-empty__title">Noch keine Zahlung</div>
          <div className="zahlplan-empty__text">
            Zahlung entsteht mit Rechnung nach Auftrag. Über ein Angebot legst du den nächsten
            Schritt fest.
          </div>
        </div>
      </MockCard>
    )
  }

  const zustandLabel =
    vorhanden.length === 0 && geplant.length > 0
      ? 'Geplant'
      : vorhanden.length === 1 && geplant.length === 0
        ? 'Einzelrechnung'
        : vorhanden.length > 1 || (vorhanden.length > 0 && geplant.length > 0)
          ? 'Vorhanden'
          : 'Vorhanden'

  return (
    <MockCard
      title="Zahlung"
      icon="calculator"
      className="zahlplan-shell"
      actions={
        <span className="text-[length:var(--fs-meta)] text-bw-text-muted">{zustandLabel}</span>
      }
    >
      <ul className="m-0 list-none space-y-2 p-0">
        {aktiv.map((r) => {
          const st = String(r.status).toLowerCase()
          const meta = badgeForStatus(st)
          return (
            <li key={r.id}>
              <Link
                href={`/rechnungen/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 no-underline transition-colors hover:bg-[var(--bg-soft)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[length:var(--fs-text)] font-semibold text-[var(--text)]">
                    {r.rechnungsnummer?.trim() || 'Rechnung'}
                  </div>
                  <div className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
                    {[
                      r.rechnungsdatum ? formatDatum(String(r.rechnungsdatum).slice(0, 10)) : null,
                      r.rechnung_art?.trim() || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Zum Lead'}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[length:var(--fs-text)] font-semibold tabular-nums text-[var(--text)]">
                    {formatEurBetrag(Number(r.brutto ?? 0) || 0)}
                  </span>
                  <StatusBadge status={meta.status} label={meta.label} />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {vorhanden.length === 0 && geplant.length > 0 ? (
        <p className="mt-3 text-[length:var(--fs-meta)] text-[var(--text-3)]">
          Entwurf vorhanden — Versand und Zahlung folgen im Auftrag bzw. auf der Rechnung.
        </p>
      ) : null}
    </MockCard>
  )
}

function badgeForStatus(st: string): { label: string; tone: StatusTone; status: string } {
  if (st === 'bezahlt') return { label: 'Bezahlt', tone: 'gruen', status: 'bezahlt' }
  if (st === 'entwurf') return { label: 'Geplant', tone: 'grau', status: 'geplant' }
  if (st === 'gesendet' || st === 'gestellt' || st === 'teilbezahlt') {
    return { label: 'Gestellt', tone: 'blau', status: 'gesendet' }
  }
  return { label: st || 'Offen', tone: 'grau', status: st || 'offen' }
}
