'use client'

import { useMemo, useState } from 'react'
import { updateRechnungZahlungsziel } from '@/app/(dashboard)/rechnungen/actions'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockProp } from '@/components/mock-ui/MockProp'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { DateInput } from '@/components/ui/DateInput'
import { toast } from '@/components/ui/app-toast'
import { useTransition } from '@/components/ui/action-busy'
import { rechnungZahlungszielIstBearbeitbar } from '@/lib/rechnungen/rechnung-zahlungsziel-patch'
import { tageSeitFaelligkeitRechnung } from '@/lib/rechnungen/mahnverlauf'
import {
  zahlfristAnzeigeText,
  zahlfristSegFromFaelligAm,
  type ZahlfristSeg,
} from '@/lib/zahlfrist'
import type { Rechnung } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

function zahlungszielTageAnzeige(
  erstellt: string | null | undefined,
  faellig: string | null | undefined,
  fallback: number
): number {
  if (!erstellt || !faellig) return fallback
  const a = new Date(erstellt.slice(0, 10))
  const b = new Date(faellig.slice(0, 10))
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return fallback
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return diff > 0 ? diff : fallback
}

/** Zahlungsziel unter der Rechnungstabelle im Tab „Zahlung“. */
export function RechnungZahlungszielCard({
  detail,
  zahlungszielFallback = 14,
  onSaved,
}: {
  detail: Rechnung
  zahlungszielFallback?: number
  onSaved?: () => void
}) {
  const belegTyp = detail.beleg_typ === 'gutschrift' ? 'gutschrift' : 'rechnung'
  const bearbeitbar = rechnungZahlungszielIstBearbeitbar({
    status: detail.status,
    beleg_typ: detail.beleg_typ,
    richtung: (detail as { richtung?: string | null }).richtung,
  })

  const rechnungsdatum =
    detail.rechnungsdatum?.slice(0, 10) || detail.created_at?.slice(0, 10) || ''

  const zielTage = zahlungszielTageAnzeige(
    rechnungsdatum || detail.created_at,
    detail.faellig_am,
    zahlungszielFallback
  )

  const tageUeber = detail.faellig_am ? tageSeitFaelligkeitRechnung(detail.faellig_am) : 0
  const ueberfaellig =
    tageUeber > 0 &&
    detail.status !== 'bezahlt' &&
    detail.status !== 'storniert' &&
    belegTyp === 'rechnung'

  const zahlfristInit = useMemo(
    () =>
      zahlfristSegFromFaelligAm(
        detail.faellig_am,
        rechnungsdatum ? new Date(`${rechnungsdatum}T12:00:00`) : new Date()
      ),
    [detail.faellig_am, rechnungsdatum]
  )

  const [sheetOpen, setSheetOpen] = useState(false)
  const [zahlfrist, setZahlfrist] = useState<ZahlfristSeg>(() => zahlfristInit.seg)
  const [zahlfristDatum, setZahlfristDatum] = useState(() => zahlfristInit.datum)
  const [pending, startTransition] = useTransition()

  if (belegTyp !== 'rechnung') return null

  function openSheet() {
    setZahlfrist(zahlfristInit.seg)
    setZahlfristDatum(zahlfristInit.datum)
    setSheetOpen(true)
  }

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfrist(seg)
    if (seg === 'datum') setZahlfristDatum(datum)
  }

  function speichern() {
    startTransition(async () => {
      const r = await updateRechnungZahlungsziel({
        rechnungId: detail.id,
        zahlfrist,
        zahlfristDatum: zahlfrist === 'datum' ? zahlfristDatum : undefined,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Zahlungsziel aktualisiert')
      setSheetOpen(false)
      onSaved?.()
    })
  }

  const zahlungsText = (() => {
    if (detail.status === 'bezahlt') {
      return 'Bezahlt'
    }
    if (detail.status === 'storniert') {
      return 'Storniert'
    }
    if (ueberfaellig) {
      return `${tageUeber} Tag${tageUeber === 1 ? '' : 'e'} überfällig`
    }
    if (detail.faellig_am) {
      return `Ausstehend · fällig ${formatDatum(detail.faellig_am)}`
    }
    return 'Ausstehend'
  })()

  return (
    <>
      <div className="zahlungsziel-inline">
        <div className="zahlungsziel-inline__bar">
          <div className="props">
            <MockProp label="Zahlungsziel">
              {detail.zahlungsbedingungen?.trim()
                ? zahlfristAnzeigeText(zahlfristInit.seg, detail.faellig_am ?? zahlfristInit.datum)
                : `${zielTage} Tage`}
            </MockProp>
            <MockProp label="Fällig am">
              <span
                style={
                  ueberfaellig ? { color: 'var(--danger, #c0392b)', fontWeight: 600 } : undefined
                }
              >
                {detail.faellig_am ? formatDatum(detail.faellig_am) : '—'}
              </span>
            </MockProp>
            <MockProp label="Status">{zahlungsText}</MockProp>
          </div>
          {bearbeitbar ? (
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title="Zahlungsziel bearbeiten"
              onClick={openSheet}
              disabled={pending}
            />
          ) : null}
        </div>
      </div>

      <EditorSheet
        open={sheetOpen}
        onClose={() => !pending && setSheetOpen(false)}
        title="Zahlungsziel"
        subtitle={detail.rechnungsnummer?.trim() || undefined}
        context="detail"
        footer={
          <>
            <MockBtn kind="ghost" onClick={() => setSheetOpen(false)} disabled={pending}>
              Abbrechen
            </MockBtn>
            <MockBtn kind="primary" onClick={speichern} disabled={pending}>
              Speichern
            </MockBtn>
          </>
        }
      >
        <div className="form-grid form-grid--sheet">
          <div className="full">
            <MockField label="Zahlungsziel" full>
              <div className="space-y-2">
                <MockZahlfristSeg value={zahlfrist} onChange={(v) => applyZahlfrist(v)} />
                {zahlfrist === 'datum' ? (
                  <DateInput
                    size="sm"
                    value={zahlfristDatum}
                    onChange={(e) => applyZahlfrist('datum', e.target.value)}
                  />
                ) : null}
              </div>
            </MockField>
          </div>
          <p
            className="full text-[length:var(--fs-meta)] leading-relaxed"
            style={{ color: 'var(--text-3)', margin: 0 }}
          >
            Änderung gilt für Mahnungen und Anzeige — ohne Storno. Liegt die neue Fälligkeit in der
            Zukunft, werden offene Mahn-Stufen zurückgesetzt.
          </p>
        </div>
      </EditorSheet>
    </>
  )
}
