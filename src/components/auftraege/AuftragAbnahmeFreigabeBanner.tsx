'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import {
  ablehnenAbnahmeprotokoll,
  freigebenAbnahmeprotokoll,
  loadAbnahmeHwFreigabeZeilen,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import type { AbnahmeHwFreigabeZeile } from '@/lib/auftraege/abnahme-freigabe'
import { formatDatum, formatDatumZeit } from '@/lib/utils'

/**
 * Leistungen-Tab: Banner wenn Handwerker abgeschlossen hat (Teilabnahme zur Freigabe).
 * Abgenommen / Abgelehnt — Ablehnen setzt Signatur zurück, Partner muss erneut abschließen.
 */
export function AuftragAbnahmeFreigabeBanner({
  auftragId,
  disabled = false,
  onChanged,
}: {
  auftragId: string
  disabled?: boolean
  onChanged?: () => void
}) {
  const [zeilen, setZeilen] = useState<AbnahmeHwFreigabeZeile[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const reload = useCallback(() => {
    setLoading(true)
    void loadAbnahmeHwFreigabeZeilen(auftragId).then((z) => {
      setZeilen(z)
      setLoading(false)
    })
  }, [auftragId])

  useEffect(() => {
    reload()
  }, [reload])

  const pendingZeilen = zeilen.filter(
    (z) => z.freigabeStatus === 'zur_freigabe' && z.protokollId
  )

  if (loading && !pendingZeilen.length) return null
  if (!pendingZeilen.length) return null

  function run(
    fn: () => Promise<
      | { ok: true; bereitZumAbschliessen?: boolean }
      | { ok: false; message: string }
    >,
    okMsg: string,
    opts?: { openAbschliessen?: boolean }
  ) {
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(okMsg)
      reload()
      onChanged?.()
      if (opts?.openAbschliessen && r.bereitZumAbschliessen) {
        window.dispatchEvent(
          new CustomEvent('crm-open-auftrag-abschliessen', {
            detail: { auftragId },
          })
        )
      }
    })
  }

  return (
    <div className="abnahme-freigabe-banner" role="region" aria-label="Abnahme zur Freigabe">
      <p className="abnahme-freigabe-banner__lead">
        Handwerker hat den Auftrag abgeschlossen — Abnahme prüfen
      </p>

      <ul className="abnahme-freigabe-banner__list">
        {pendingZeilen.map((z) => (
          <li key={z.protokollId!} className="abnahme-freigabe-banner__item">
            <div className="abnahme-freigabe-banner__main">
              <p className="abnahme-freigabe-banner__title">{z.handwerkerName}</p>
              <p className="abnahme-freigabe-banner__meta">
                {[
                  z.abnahmeDatum ? `Datum ${formatDatum(z.abnahmeDatum)}` : null,
                  z.abnahmeSigniertAm
                    ? `Signiert ${formatDatumZeit(z.abnahmeSigniertAm)}`
                    : null,
                  z.ort ? `Ort: ${z.ort}` : null,
                  z.ergebnisLabel,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <ul className="abnahme-freigabe-banner__facts">
                {z.leistungenGesamt != null && z.leistungenGesamt > 0 ? (
                  <li>
                    Leistungen: {z.leistungenOk ?? 0}/{z.leistungenGesamt} ok
                  </li>
                ) : null}
                {z.maengelOffen > 0 ? (
                  <li>
                    Mängel offen: {z.maengelOffen}
                    {z.maengelTitel?.length
                      ? ` — ${z.maengelTitel.join(', ')}`
                      : ''}
                  </li>
                ) : (
                  <li>Keine offenen Mängel</li>
                )}
                {z.unterzeichnerHw ? <li>Unterschrift HW: {z.unterzeichnerHw}</li> : null}
                {z.unterzeichnerKunde ? (
                  <li>Unterschrift Kunde: {z.unterzeichnerKunde}</li>
                ) : null}
              </ul>
              {z.pdfUrl ? (
                <a
                  className="abnahme-freigabe-banner__pdf"
                  href={z.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abnahmeprotokoll PDF öffnen
                </a>
              ) : (
                <p className="abnahme-freigabe-banner__pdf-miss">
                  PDF noch nicht verfügbar — Daten unten prüfen.
                </p>
              )}
            </div>
            {!disabled ? (
              <div className="abnahme-freigabe-banner__actions">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => freigebenAbnahmeprotokoll(z.protokollId!, auftragId),
                      'Abgenommen — Auftrag kann abgeschlossen werden.',
                      { openAbschliessen: true }
                    )
                  }
                >
                  Abgenommen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    const notiz =
                      window.prompt(
                        'Ablehnung — Notiz für den Handwerker (optional):'
                      ) ?? ''
                    run(
                      () =>
                        ablehnenAbnahmeprotokoll({
                          protokollId: z.protokollId!,
                          auftragId,
                          notiz: notiz.trim() || null,
                        }),
                      'Abgelehnt — Handwerker kann erneut abschließen.'
                    )
                  }}
                >
                  Abgelehnt
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
