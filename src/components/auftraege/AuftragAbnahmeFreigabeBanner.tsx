'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  ablehnenAbnahmeprotokoll,
  freigebenAbnahmeprotokoll,
  loadAbnahmeHwFreigabeZeilen,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import type { AbnahmeHwFreigabeZeile } from '@/lib/auftraege/abnahme-freigabe'
import { formatDatum, formatDatumZeit } from '@/lib/utils'

type PendingAction =
  | { kind: 'freigeben'; zeile: AbnahmeHwFreigabeZeile }
  | { kind: 'ablehnen'; zeile: AbnahmeHwFreigabeZeile }

/**
 * Leistungen-Tab: Banner wenn Handwerker abgeschlossen hat (Teilabnahme zur Freigabe).
 * Abgenommen / Abgelehnt — erst nach Bestätigung im Sheet; Abbrechen lässt den Banner.
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<PendingAction | null>(null)
  const [ablehnNotiz, setAblehnNotiz] = useState('')

  const reload = useCallback(() => {
    void loadAbnahmeHwFreigabeZeilen(auftragId).then((z) => {
      setZeilen(z)
      setInitialLoading(false)
    })
  }, [auftragId])

  useEffect(() => {
    setInitialLoading(true)
    reload()
  }, [reload])

  const pendingZeilen = zeilen.filter(
    (z) => z.freigabeStatus === 'zur_freigabe' && z.protokollId
  )

  if (initialLoading) return null
  if (!pendingZeilen.length) return null

  function closeSheet() {
    if (pending) return
    setAction(null)
    setAblehnNotiz('')
  }

  function runFreigabe(zeile: AbnahmeHwFreigabeZeile) {
    if (pending || !zeile.protokollId) return
    setPending(true)
    void actionBusy
      .run('Abnahme wird freigegeben…', async () => {
        const r = await freigebenAbnahmeprotokoll(zeile.protokollId!, auftragId)
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success(
          r.bereitZumAbschliessen
            ? 'Abgenommen — Auftrag kann jetzt abgeschlossen werden.'
            : 'Abgenommen.'
        )
        setAction(null)
        setAblehnNotiz('')
        reload()
        onChanged?.()
        // Abschluss-Sheet nicht automatisch öffnen: Abbrechen dort wirkte wie
        // „nichts gemacht“, obwohl die Freigabe schon gelaufen war.
      })
      .finally(() => setPending(false))
  }

  function runAblehnen(zeile: AbnahmeHwFreigabeZeile) {
    if (pending || !zeile.protokollId) return
    setPending(true)
    void actionBusy
      .run('Abnahme wird abgelehnt…', async () => {
        const r = await ablehnenAbnahmeprotokoll({
          protokollId: zeile.protokollId!,
          auftragId,
          notiz: ablehnNotiz.trim() || null,
        })
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success('Abgelehnt — Handwerker kann erneut abschließen.')
        setAction(null)
        setAblehnNotiz('')
        reload()
        onChanged?.()
      })
      .finally(() => setPending(false))
  }

  const sheetOpen = Boolean(action)
  const sheetTitle =
    action?.kind === 'ablehnen' ? 'Abnahme ablehnen' : 'Abnahme freigeben'
  const composeLabel = action?.kind === 'ablehnen' ? 'Ablehnen' : 'Abgenommen'

  return (
    <>
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
                    onClick={() => {
                      setAblehnNotiz('')
                      setAction({ kind: 'freigeben', zeile: z })
                    }}
                  >
                    Abgenommen
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setAblehnNotiz('')
                      setAction({ kind: 'ablehnen', zeile: z })
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

      <EditorSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={sheetTitle}
        context="detail"
        size="md"
        compose
        composeLabel={composeLabel}
        confirmBusy={pending}
        confirmDisabled={pending}
        onConfirm={() => {
          if (!action) return
          if (action.kind === 'freigeben') runFreigabe(action.zeile)
          else runAblehnen(action.zeile)
        }}
      >
        {action ? (
          <div className="space-y-3">
            <p className="text-[length:var(--fs-text)] text-[var(--text)]">
              {action.kind === 'freigeben'
                ? `Abnahme von ${action.zeile.handwerkerName} freigeben?`
                : `Abnahme von ${action.zeile.handwerkerName} ablehnen? Der Handwerker kann danach erneut abschließen.`}
            </p>
            {action.kind === 'ablehnen' ? (
              <Textarea
                label="Notiz für den Handwerker (optional)"
                value={ablehnNotiz}
                onChange={(e) => setAblehnNotiz(e.target.value)}
                rows={3}
              />
            ) : null}
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}
