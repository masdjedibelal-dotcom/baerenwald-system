'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import {
  decidePartnerPositionsAnfrageAblehnen,
  decidePartnerPositionsAnfrageIntern,
  decidePartnerPositionsAnfrageNachtrag,
  decideWeitereArbeitMitNotify,
  listPartnerPositionsAnfragen,
  listWeitereArbeitInPruefung,
  type PartnerPositionsAnfrageRow,
  type WeitereArbeitInPruefungRow,
} from '@/app/(dashboard)/auftraege/partner-positions-anfrage-actions'
import { formatDatumZeit } from '@/lib/utils'

function schaetzungLabel(row: PartnerPositionsAnfrageRow): string | null {
  const parts: string[] = []
  if (row.schaetzung_eur != null && Number.isFinite(row.schaetzung_eur)) {
    parts.push(
      `${row.schaetzung_eur.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })}`
    )
  }
  if (row.schaetzung_minuten != null && row.schaetzung_minuten > 0) {
    parts.push(`${row.schaetzung_minuten} Min`)
  }
  return parts.length ? parts.join(' · ') : null
}

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
  if (loading && !offen.length && !regie.length) return null
  if (!offen.length && !regie.length) return null

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
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-3 text-[length:var(--fs-text)] text-amber-950">
      <div>
        <p className="font-semibold">Partner-Meldungen zur Prüfung</p>
        <p className="mt-0.5 text-[length:var(--fs-meta)] text-amber-900/80">
          Nachtrag/neue Position oder weitere Regie-Arbeit — entscheiden und Partner informieren.
        </p>
      </div>

      {offen.map((row) => (
        <div
          key={row.id}
          className="rounded-md border border-amber-200 bg-white/70 px-3 py-2.5 space-y-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{row.titel}</p>
            <span className="text-[length:var(--fs-meta)] text-amber-900/70">
              {formatDatumZeit(row.created_at)}
            </span>
          </div>
          {row.handwerker_name ? (
            <p className="text-[length:var(--fs-meta)]">Partner: {row.handwerker_name}</p>
          ) : null}
          {row.begruendung ? (
            <p className="text-[length:var(--fs-meta)] whitespace-pre-wrap">{row.begruendung}</p>
          ) : null}
          {schaetzungLabel(row) ? (
            <p className="text-[length:var(--fs-meta)]">Schätzung: {schaetzungLabel(row)}</p>
          ) : null}
          {!disabled ? (
            <div className="flex flex-wrap gap-2 pt-1">
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
                Intern zuweisen
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    decidePartnerPositionsAnfrageNachtrag({ anfrageId: row.id })
                  )
                }
              >
                Kunden-Nachtrag
              </Button>
              <Button
                variant="ghost"
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
        </div>
      ))}

      {regie.map((row) => (
        <div
          key={row.id}
          className="rounded-md border border-amber-200 bg-white/70 px-3 py-2.5 space-y-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              Weitere Arbeit: {row.leistung_name || 'Regie'}
            </p>
            {row.created_at ? (
              <span className="text-[length:var(--fs-meta)] text-amber-900/70">
                {formatDatumZeit(row.created_at)}
              </span>
            ) : null}
          </div>
          {row.handwerker_name ? (
            <p className="text-[length:var(--fs-meta)]">Partner: {row.handwerker_name}</p>
          ) : null}
          {row.beschreibung ? (
            <p className="text-[length:var(--fs-meta)] whitespace-pre-wrap">{row.beschreibung}</p>
          ) : null}
          {!disabled ? (
            <div className="flex flex-wrap gap-2 pt-1">
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
                Anerkennen
              </Button>
              <Button
                variant="ghost"
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
        </div>
      ))}
    </div>
  )
}
