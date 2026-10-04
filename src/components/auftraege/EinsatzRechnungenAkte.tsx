'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  einsatzRechnungBezahlt,
  listEinsaetze,
  type EinsatzZeile,
} from '@/app/(dashboard)/auftraege/einsatz-actions'
import { MockBadge, MockBtn, MockCard } from '@/components/mock-ui'
import { toast } from '@/components/ui/app-toast'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum } from '@/lib/format/geld-datum'

/**
 * Partner-Rechnungen zum Vorgang (Einsatz-Upload vom Partner oder von Bärenwald).
 * Nur Dokument + Offen/Bezahlt — keine eigene Eingangsrechnungs-Liste mehr (04.10.2026).
 */
export function EinsatzRechnungenAkte({ auftragId }: { auftragId: string }) {
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

  if (!rows?.length) return null

  return (
    <MockCard title="Partner-Rechnungen" icon="file-invoice">
      <div className="einsatz-rechnungen">
        {rows.map((e) => (
          <div key={e.id} className="einsatz-rechnung-zeile">
            <div className="einsatz-rechnung-zeile__text">
              <span className="einsatz-rechnung-zeile__name">{e.partner_name}</span>
              <span className="einsatz-rechnung-zeile__meta">
                {[e.titel, e.rechnung_eingereicht_at ? formatDatum(e.rechnung_eingereicht_at) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div className="einsatz-rechnung-zeile__aktionen">
              {e.rechnung_pdf_url ? (
                <a href={e.rechnung_pdf_url} target="_blank" rel="noreferrer" className="einsatz-rechnung-zeile__pdf">
                  PDF öffnen
                </a>
              ) : null}
              <MockBadge kind={e.rechnung_bezahlt_at ? 'fertig' : 'warten'}>
                {e.rechnung_bezahlt_at ? 'Bezahlt' : 'Offen'}
              </MockBadge>
              <MockBtn
                sm
                kind={e.rechnung_bezahlt_at ? 'ghost' : 'secondary'}
                disabled={busyId === e.id}
                onClick={() => umschalten(e)}
              >
                {e.rechnung_bezahlt_at ? 'Wieder offen' : 'Als bezahlt markieren'}
              </MockBtn>
            </div>
          </div>
        ))}
      </div>
    </MockCard>
  )
}
