'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { Button } from '@/components/ui/Button'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
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

type PendingAction =
  | { item: PruefItem; decision: 'annehmen' }
  | { item: PruefItem; decision: 'ablehnen' }

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

function itemTitle(item: PruefItem): string {
  if (item.kind === 'anfrage') return item.row.titel
  return item.row.leistung_name || 'Weitere Arbeit'
}

/**
 * Flacher Hinweis: Nacharbeit vom Handwerker — Annehmen / Ablehnen erst nach Bestätigung im Sheet.
 * Abbrechen ohne Bestätigung lässt den Banner stehen.
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<PendingAction | null>(null)

  const reload = useCallback(() => {
    void Promise.all([
      listPartnerPositionsAnfragen(auftragId),
      listWeitereArbeitInPruefung(auftragId),
    ]).then(([a, r]) => {
      setAnfragen(a)
      setRegie(r)
      setInitialLoading(false)
    })
  }, [auftragId])

  useEffect(() => {
    setInitialLoading(true)
    reload()
  }, [reload])

  const offen = anfragen.filter((a) => a.status === 'offen')
  const items: PruefItem[] = [
    ...offen.map((row) => ({ kind: 'anfrage' as const, row })),
    ...regie.map((row) => ({ kind: 'regie' as const, row })),
  ]

  if (initialLoading) return null
  if (!items.length) return null

  function closeSheet() {
    if (pending) return
    setAction(null)
  }

  function runDecision(pendingAction: PendingAction) {
    if (pending) return
    const { item, decision } = pendingAction
    const label =
      decision === 'annehmen'
        ? item.kind === 'anfrage'
          ? 'Nacharbeit wird angenommen…'
          : 'Regie wird angenommen…'
        : item.kind === 'anfrage'
          ? 'Nacharbeit wird abgelehnt…'
          : 'Regie wird abgelehnt…'

    setPending(true)
    void actionBusy
      .run(label, async () => {
        const r =
          item.kind === 'anfrage'
            ? decision === 'annehmen'
              ? await decidePartnerPositionsAnfrageIntern({ anfrageId: item.row.id })
              : await decidePartnerPositionsAnfrageAblehnen({ anfrageId: item.row.id })
            : await decideWeitereArbeitMitNotify({
                positionId: item.row.id,
                status: decision === 'annehmen' ? 'anerkannt' : 'abgelehnt',
              })
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success(r.message ?? 'Gespeichert')
        setAction(null)
        reload()
        onChanged?.()
      })
      .finally(() => setPending(false))
  }

  return (
    <>
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
                        onClick={() => setAction({ item, decision: 'annehmen' })}
                      >
                        Annehmen
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => setAction({ item, decision: 'ablehnen' })}
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
                      onClick={() => setAction({ item, decision: 'annehmen' })}
                    >
                      Annehmen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => setAction({ item, decision: 'ablehnen' })}
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

      <EditorSheet
        open={Boolean(action)}
        onClose={closeSheet}
        title={
          action?.decision === 'ablehnen'
            ? 'Nacharbeit ablehnen'
            : 'Nacharbeit annehmen'
        }
        context="detail"
        size="md"
        compose
        composeLabel={action?.decision === 'ablehnen' ? 'Ablehnen' : 'Annehmen'}
        confirmBusy={pending}
        confirmDisabled={pending}
        onConfirm={() => {
          if (action) runDecision(action)
        }}
      >
        {action ? (
          <p className="text-[length:var(--fs-text)] text-[var(--text)]">
            {action.decision === 'annehmen'
              ? `„${itemTitle(action.item)}“ wirklich annehmen?`
              : `„${itemTitle(action.item)}“ wirklich ablehnen?`}
          </p>
        ) : null}
      </EditorSheet>
    </>
  )
}
