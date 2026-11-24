'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  einsatzRechnungBezahlt,
  listEinsaetze,
  type EinsatzZeile,
} from '@/app/(dashboard)/auftraege/einsatz-actions'
import { MockBadge, MockBtn, MockCard } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { LadeZeilen } from '@/components/ui/LadeZeilen'
import { toast } from '@/components/ui/app-toast'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum, formatEuro } from '@/lib/format/geld-datum'

/**
 * Partner-Rechnungen zum Vorgang (Einsatz-Upload vom Partner oder von Bärenwald).
 * Nur Dokument + Offen/Bezahlt — keine eigene Eingangsrechnungs-Liste mehr (04.10.2026).
 */
export function EinsatzRechnungenAkte({ auftragId, immerZeigen = false }: { auftragId: string; immerZeigen?: boolean }) {
  const [rows, setRows] = useState<EinsatzZeile[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const laden = useCallback(async () => {
    const res = await safeAction(listEinsaetze(auftragId))
    if (res.ok) setRows(res.einsaetze.filter((e) => e.rechnung_eingereicht_at))
  }, [auftragId])

  useEffect(() => {
    void laden()
  }, [laden])

  async function umschalten(e: EinsatzZeile) {
    setBusyId(e.id)
    const res = await safeAction(einsatzRechnungBezahlt(e.id, !e.rechnung_bezahlt_at))
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    await laden()
  }

  // Bärenwald: nur anzeigen, wenn vorhanden (Akte). TEO: feste Karte im Reiter Zahlung, mit Ladezustand.
  if (!immerZeigen && !rows?.length) return null

  return (
    <MockCard title="Partner-Rechnungen">
      {rows === null ? (
        <LadeZeilen anzahl={1} hoehe={56} />
      ) : rows.length === 0 ? (
        <p className="empty">Noch keine Rechnung von Partnern.</p>
      ) : (
        <ul className="partner-rechnungen">
          {rows.map((e) => {
            const bezahlt = Boolean(e.rechnung_bezahlt_at)
            const meta = [
              e.titel,
              e.rechnung_eingereicht_at ? `eingereicht ${formatDatum(e.rechnung_eingereicht_at)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={e.id} className="partner-rechnung">
                <a
                  className="partner-rechnung__haupt"
                  href={e.rechnung_pdf_url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!e.rechnung_pdf_url}
                >
                  <span className="partner-rechnung__icon" aria-hidden>
                    <MockIcon ctx="default" n="file-invoice" size={18} />
                  </span>
                  <span className="partner-rechnung__text">
                    <span className="partner-rechnung__name">{e.partner_name}</span>
                    <span className="partner-rechnung__meta">{meta}</span>
                  </span>
                  <span className="partner-rechnung__rechts">
                    {e.rechnung_betrag != null ? (
                      <span className="partner-rechnung__betrag">{formatEuro(e.rechnung_betrag)}</span>
                    ) : null}
                    <MockBadge kind={bezahlt ? 'fertig' : 'warten'}>{bezahlt ? 'Bezahlt' : 'Offen'}</MockBadge>
                  </span>
                </a>
                <div className="partner-rechnung__aktion">
                  <MockBtn
                    sm
                    kind={bezahlt ? 'ghost' : 'secondary'}
                    disabled={busyId === e.id}
                    onClick={() => umschalten(e)}
                  >
                    {bezahlt ? 'Wieder auf offen' : 'Als bezahlt markieren'}
                  </MockBtn>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </MockCard>
  )
}
