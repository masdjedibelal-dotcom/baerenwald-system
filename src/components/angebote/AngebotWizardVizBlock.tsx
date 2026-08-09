'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { KiVisualisierung } from '@/lib/visualize/types'
import { formatDatumZeit } from '@/lib/utils'

function sessionVorschau(s: KiVisualisierung): {
  istUrl: string | null
  nachherUrl: string | null
} {
  const haupt =
    s.ausgewaehlte_urls[0]?.trim() ||
    s.prompt_history[s.prompt_history.length - 1]?.ergebnis_url?.trim() ||
    null
  const entry =
    s.prompt_history.find((h) => h.ergebnis_url === haupt) ?? s.prompt_history[s.prompt_history.length - 1]
  const istUrl = entry?.ist_bild_url?.trim() || s.ist_bilder_urls[0]?.trim() || null
  return { istUrl, nachherUrl: haupt }
}

export function AngebotWizardVizBlock({
  angebotId,
  disabled,
}: {
  angebotId: string | null
  disabled?: boolean
}) {
  const [sessions, setSessions] = useState<KiVisualisierung[]>([])
  const [loading, setLoading] = useState(false)

  const loadSessions = useCallback(async () => {
    if (!angebotId) {
      setSessions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/visualize/sessions?angebot_id=${encodeURIComponent(angebotId)}`)
      const data = (await res.json()) as { sessions?: KiVisualisierung[] }
      if (res.ok && data.sessions) setSessions(data.sessions)
    } catch {
      /* optional */
    } finally {
      setLoading(false)
    }
  }, [angebotId])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    function onFocus() {
      void loadSessions()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadSessions])

  if (!angebotId) {
    return (
      <Card
        className="wizard-projekt-viz"
        title={
          <>
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
            KI-Visualisierung
          </>
        }
      >
        <p className="text-sm text-bw-text-muted">
          Entwurf einmal speichern — dann kannst du Fotos visualisieren und die Ergebnisse ins Angebot
          übernehmen.
        </p>
      </Card>
    )
  }

  const imAngebot = sessions.filter((s) => s.ins_angebot && s.prompt_history.length > 0)
  const andere = sessions.filter((s) => !s.ins_angebot || s.prompt_history.length === 0)

  return (
    <Card
      className="wizard-projekt-viz"
      title={
        <>
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-bw-primary" aria-hidden />
          KI-Visualisierung
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-bw-text-muted">
          Vorher/Nachher aus Fotodokumentation — erscheint im PDF wenn „Ins Angebot übernommen“.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() =>
            window.open(`/angebote/${angebotId}/visualisierung`, '_blank', 'noopener,noreferrer')
          }
        >
          Neue Visualisierung
        </Button>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-bw-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Lädt …
        </div>
      ) : null}

      {!loading && sessions.length === 0 ? (
        <p className="mt-3 text-sm text-bw-text-muted">
          Noch keine Visualisierung — bei einem Foto auf „Visualisieren“ klicken.
        </p>
      ) : null}

      {imAngebot.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2E7D52]">Im Angebot (PDF)</p>
          {imAngebot.map((s) => {
            const { istUrl, nachherUrl } = sessionVorschau(s)
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[#2E7D52]/25 bg-[#EEF3EC]/60 p-2"
              >
                <div className="flex gap-2">
                  {istUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={istUrl} alt="Vorher" className="h-14 w-14 rounded-md object-cover" />
                  ) : null}
                  {nachherUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nachherUrl} alt="Nachher" className="h-14 w-14 rounded-md object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 text-xs text-bw-text-muted">
                  {formatDatumZeit(s.created_at)}
                  {s.prompt_history.length > 1 ? ` · ${s.prompt_history.length} Versionen` : ''}
                </div>
                <button
                  type="button"
                  className="text-xs text-bw-link hover:underline"
                  disabled={disabled}
                  onClick={() =>
                    window.open(
                      `/angebote/${angebotId}/visualisierung?session=${encodeURIComponent(s.id)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Bearbeiten →
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {!loading && andere.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-bw-text-muted">Weitere Sessions</p>
          {andere.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-bw-text-muted">{formatDatumZeit(s.created_at)} · {s.status}</span>
              <button
                type="button"
                className="text-bw-link hover:underline"
                disabled={disabled}
                onClick={() =>
                  window.open(
                    `/angebote/${angebotId}/visualisierung?session=${encodeURIComponent(s.id)}`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                Öffnen
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
