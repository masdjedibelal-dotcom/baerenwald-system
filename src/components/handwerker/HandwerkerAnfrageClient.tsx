'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
  type HandwerkerAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import type { HandwerkerAnfragePublicPayload } from '@/lib/handwerker-anfrage-types'
import { formatDatum } from '@/lib/utils'

type Flow = 'laden' | 'offen' | 'ablehnung_form' | 'bestaetigen' | 'fertig'

export function HandwerkerAnfrageClient({ token }: { token: string }) {
  const [data, setData] = useState<HandwerkerAnfragePublicPayload | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [flow, setFlow] = useState<Flow>('laden')
  const [wahl, setWahl] = useState<'akzeptiert' | 'abgelehnt' | null>(null)
  const [notiz, setNotiz] = useState('')
  const [ablehnungGrund, setAblehnungGrund] = useState<HandwerkerAblehnungGrund | ''>('')
  const [busy, setBusy] = useState(false)

  const laden = useCallback(async () => {
    setFehler(null)
    const res = await fetch(`/api/handwerker/anfrage/${encodeURIComponent(token)}`)
    if (!res.ok) {
      setFehler('Dieser Link ist nicht mehr gültig.')
      setFlow('fertig')
      return
    }
    const json = (await res.json()) as HandwerkerAnfragePublicPayload
    setData(json)
    if (json.antwort_at && json.antwort) {
      setFlow('fertig')
    } else {
      setFlow('offen')
    }
  }, [token])

  useEffect(() => {
    void laden()
  }, [laden])

  async function absenden() {
    if (!wahl) return
    if (wahl === 'abgelehnt' && !ablehnungGrund) {
      toast.error('Bitte einen Grund auswählen.')
      return
    }
    setBusy(true)
    try {
      const body =
        wahl === 'abgelehnt'
          ? {
              antwort: 'abgelehnt' as const,
              grund: ablehnungGrund,
              notiz: notiz.trim() || undefined,
            }
          : { antwort: 'akzeptiert' as const, notiz: notiz.trim() || undefined }
      const res = await fetch(`/api/handwerker/anfrage/${encodeURIComponent(token)}/antwort`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? 'Speichern fehlgeschlagen')
        return
      }
      setFlow('fertig')
      toast.success(wahl === 'akzeptiert' ? 'Antwort gespeichert' : 'Rückmeldung gespeichert')
      await laden()
    } finally {
      setBusy(false)
    }
  }

  if (flow === 'laden' && !fehler) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center text-muted">
        <p>Wird geladen…</p>
      </div>
    )
  }

  if (fehler || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-lg font-medium text-ink">{fehler ?? 'Link ungültig'}</p>
      </div>
    )
  }

  if (flow === 'fertig' && data.antwort && data.antwort_at) {
    const txt =
      data.antwort === 'akzeptiert'
        ? 'Sie haben diese Anfrage angenommen.'
        : 'Sie haben diese Anfrage abgelehnt.'
    const success =
      data.antwort === 'akzeptiert'
        ? 'Vielen Dank! Wir melden uns kurzfristig.'
        : 'Danke für die Rückmeldung.'
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <p className="text-center text-sm text-muted">{txt}</p>
        <p className="mt-4 text-center text-lg font-semibold text-primary">{success}</p>
      </div>
    )
  }

  const fristText =
    data.antwort_frist_iso != null ? formatDatum(data.antwort_frist_iso) : null

  if (flow === 'ablehnung_form' && wahl === 'abgelehnt') {
    const grundOptions = [
      { value: '', label: 'Grund wählen' },
      ...HANDWERKER_ABLEHNUNG_GRUND_VALUES.map((v) => ({
        value: v,
        label: HANDWERKER_ABLEHNUNG_GRUND_LABELS[v],
      })),
    ]
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Anfrage ablehnen</h2>
        <Select
          label="Grund"
          name="grund"
          required
          value={ablehnungGrund}
          onChange={(e) => setAblehnungGrund(e.target.value as HandwerkerAblehnungGrund | '')}
          options={grundOptions}
        />
        <div className="mt-4">
          <Textarea
            label="Freitext (optional)"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="danger"
            className="min-h-[52px] w-full"
            loading={busy}
            onClick={() => void absenden()}
          >
            Absenden
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[52px] w-full"
            disabled={busy}
            onClick={() => {
              setFlow('offen')
              setWahl(null)
              setNotiz('')
              setAblehnungGrund('')
            }}
          >
            Zurück
          </Button>
        </div>
      </div>
    )
  }

  if (flow === 'bestaetigen' && wahl === 'akzeptiert') {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Anfrage annehmen</h2>
        <Textarea
          label="Anmerkungen (optional)"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          rows={4}
        />
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="min-h-[52px] w-full"
            loading={busy}
            onClick={() => void absenden()}
          >
            Bestätigen
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[52px] w-full"
            disabled={busy}
            onClick={() => {
              setFlow('offen')
              setWahl(null)
              setNotiz('')
            }}
          >
            Zurück
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-6">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bärenwald</p>
        <h1 className="text-xl font-bold text-ink">Neue Anfrage</h1>
        <p className="mt-1 text-sm text-muted">Hallo {data.handwerker_name}</p>
      </header>

      {fristText && data.status !== 'akzeptiert' && data.status !== 'abgelehnt' ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-950">
          Bitte antworten Sie bis <strong>{fristText}</strong>
        </div>
      ) : null}

      <Card className="mb-6 space-y-2 p-4">
        <p className="text-xs font-medium uppercase text-muted">Gewerk</p>
        <p className="text-lg font-bold text-ink">{data.gewerk_name}</p>
        <p className="text-sm text-muted">
          Einsatzort: {data.plz} {data.ort}
        </p>
        {data.zeitraum ? (
          <p className="text-sm text-muted">Zeitraum: {data.zeitraum}</p>
        ) : null}
        {data.geplanter_start ? (
          <p className="text-sm text-muted">Geplanter Start: {formatDatum(data.geplanter_start)}</p>
        ) : null}
      </Card>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-ink">
          {data.positionen.length > 1
            ? `Ihre Aufgaben (${data.positionen.length} Positionen)`
            : 'Ihre Aufgabe'}
        </h2>
        <ul className="space-y-3">
          {data.positionen.length === 0 ? (
            <li className="text-sm text-muted">Keine Positionen für dieses Gewerk.</li>
          ) : (
            data.positionen.map((p, i) => {
              const titel = (p.leistung?.trim() || p.beschreibung).trim()
              const beschr =
                p.leistung?.trim() && p.beschreibung.trim() && p.beschreibung.trim() !== p.leistung.trim()
                  ? p.beschreibung.trim()
                  : ''
              return (
                <li key={i} className="rounded-lg border border-border bg-surface p-3 text-sm">
                  {data.positionen.length > 1 ? (
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                      Position {i + 1}
                    </p>
                  ) : null}
                  <p className="font-medium text-ink">{titel}</p>
                  {beschr ? (
                    <p className="mt-1 whitespace-pre-wrap text-muted">{beschr}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    {p.menge} {p.einheit}
                  </p>
                </li>
              )
            })
          )}
        </ul>
      </section>

      <Card className="mb-8 space-y-2 p-4 text-sm">
        <p className="font-semibold text-ink">Bei Fragen</p>
        {data.kontakt_telefon ? (
          <p>
            <a href={`tel:${data.kontakt_telefon.replace(/\s/g, '')}`} className="text-primary underline">
              {data.kontakt_telefon}
            </a>
          </p>
        ) : null}
        <p>
          <a href={`mailto:${data.kontakt_email}`} className="text-primary underline">
            {data.kontakt_email}
          </a>
        </p>
      </Card>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="primary"
          className="min-h-[52px] w-full text-base"
          onClick={() => {
            setWahl('akzeptiert')
            setFlow('bestaetigen')
          }}
        >
          Ich nehme die Anfrage an
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[52px] w-full border border-danger/40 text-base text-danger hover:bg-danger/5"
          onClick={() => {
            setWahl('abgelehnt')
            setAblehnungGrund('')
            setNotiz('')
            setFlow('ablehnung_form')
          }}
        >
          Ich bin leider nicht verfügbar
        </Button>
      </div>
    </div>
  )
}
