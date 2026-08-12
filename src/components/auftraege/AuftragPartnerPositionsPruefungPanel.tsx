'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import {
  decidePartnerPositionsAnfrageAblehnen,
  decidePartnerPositionsAnfrageIntern,
  decideWeitereArbeitMitNotify,
  listPartnerPositionsAnfragen,
  listWeitereArbeitInPruefung,
  type PartnerPositionsAnfrageRow,
  type WeitereArbeitInPruefungRow,
} from '@/app/(dashboard)/auftraege/partner-positions-anfrage-actions'
import { formatDatumZeit } from '@/lib/utils'

type PruefItem =
  | { kind: 'anfrage'; row: PartnerPositionsAnfrageRow }
  | { kind: 'regie'; row: WeitereArbeitInPruefungRow }

function schaetzungAnfrage(row: PartnerPositionsAnfrageRow): string | null {
  const parts: string[] = []
  if (row.schaetzung_eur != null && Number.isFinite(row.schaetzung_eur)) {
    parts.push(
      row.schaetzung_eur.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })
    )
  }
  if (row.schaetzung_minuten != null && row.schaetzung_minuten > 0) {
    parts.push(`${row.schaetzung_minuten} Min`)
  }
  return parts.length ? parts.join(' · ') : null
}

function schaetzungRegie(row: WeitereArbeitInPruefungRow): string | null {
  const parts: string[] = []
  if (row.preis_partner != null && row.preis_partner > 0) {
    parts.push(
      row.preis_partner.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })
    )
  }
  if (row.menge != null && row.menge > 0) {
    parts.push(`${row.menge} ${row.einheit?.trim() || 'Std'}`)
  }
  return parts.length ? parts.join(' · ') : null
}

/**
 * Flacher Hinweis: Nacharbeit vom Handwerker — nur Annehmen / Ablehnen.
 * Kein Card-in-Card, kein Kunden-Nachtrag / Intern-zuweisen.
 */
export function AuftragPartnerPositionsPruefungPanel({
  auftragId,
  disabled = false,
  onChanged,
}: {
  auftragId: string
  disabled?: boolean
  onChanged?: () => void
}) {
  const [anfragen, setAnfragen] = useState<PartnerPositionsAnfrageRow[]>([])
  const [regie, setRegie] = useState<WeitereArbeitInPruefungRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  function reload() {
    setLoading(true)
    void Promise.all([
      listPartnerPositionsAnfragen(auftragId),
      listWeitereArbeitInPruefung(auftragId),
    ]).then(([a, r]) => {
      setAnfragen(a)
      setRegie(r)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on auftrag change
  }, [auftragId])

  const offen = anfragen.filter((a) => a.status === 'offen')
  const items: PruefItem[] = [
    ...offen.map((row) => ({ kind: 'anfrage' as const, row })),
    ...regie.map((row) => ({ kind: 'regie' as const, row })),
  ]

  if (loading && !items.length) return null
  if (!items.length) return null

  function run(fn: () => Promise<{ ok: true; message?: string } | { ok: false; message: string }>) {
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(r.message ?? 'Gespeichert')
      reload()
      onChanged?.()
    })
  }

  return (
    <div className="hw-pruef-banner" role="region" aria-label="Nacharbeit zur Prüfung">
      <p className="hw-pruef-banner__lead">
        Weitere Nacharbeiten / Regiearbeiten vom Handwerker eingereicht
      </p>

      <ul className="hw-pruef-banner__list">
        {items.map((item) => {
          if (item.kind === 'anfrage') {
            const row = item.row
            const sch = schaetzungAnfrage(row)
            return (
              <li key={`a-${row.id}`} className="hw-pruef-banner__item">
                <div className="hw-pruef-banner__item-main">
                  <p className="hw-pruef-banner__title">{row.titel}</p>
                  <p className="hw-pruef-banner__meta">
                    {[
                      row.handwerker_name ? `Partner: ${row.handwerker_name}` : null,
                      formatDatumZeit(row.created_at),
                      sch,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {row.begruendung?.trim() ? (
                    <p className="hw-pruef-banner__body">{row.begruendung.trim()}</p>
                  ) : null}
                </div>
                {!disabled ? (
                  <div className="hw-pruef-banner__actions">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          decidePartnerPositionsAnfrageIntern({ anfrageId: row.id })
                        )
                      }
                    >
                      Annehmen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          decidePartnerPositionsAnfrageAblehnen({ anfrageId: row.id })
                        )
                      }
                    >
                      Ablehnen
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          }

          const row = item.row
          const sch = schaetzungRegie(row)
          const begr =
            (row.beschreibung ?? '')
              .replace(
                /\n*Nachtrag\s*\/\s*Regie\s*[—\-–]\s*wartet auf Freigabe durch Bärenwald\.?\s*$/i,
                ''
              )
              .trim() || null
          return (
            <li key={`r-${row.id}`} className="hw-pruef-banner__item">
              <div className="hw-pruef-banner__item-main">
                <p className="hw-pruef-banner__title">
                  {row.leistung_name || 'Weitere Arbeit'}
                </p>
                <p className="hw-pruef-banner__meta">
                  {[
                    row.handwerker_name ? `Partner: ${row.handwerker_name}` : null,
                    row.created_at ? formatDatumZeit(row.created_at) : null,
                    sch,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {begr ? <p className="hw-pruef-banner__body">{begr}</p> : null}
              </div>
              {!disabled ? (
                <div className="hw-pruef-banner__actions">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        decideWeitereArbeitMitNotify({
                          positionId: row.id,
                          status: 'anerkannt',
                        })
                      )
                    }
                  >
                    Annehmen
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        decideWeitereArbeitMitNotify({
                          positionId: row.id,
                          status: 'abgelehnt',
                        })
                      )
                    }
                  >
                    Ablehnen
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
