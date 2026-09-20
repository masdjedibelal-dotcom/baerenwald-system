'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MockBtn } from '@/components/mock-ui'
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
        {null}
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <MockBtn
          type="button"
          kind="secondary" sm
          disabled={disabled}
          onClick={() =>
            window.open(`/angebote/${angebotId}/visualisierung`, '_blank', 'noopener,noreferrer')
          }
        >
          Neue Visualisierung
        </MockBtn>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-[length:var(--fs-text)] text-bw-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Lädt …
        </div>
      ) : null}

      {!loading && sessions.length === 0 ? (
        <p className="mt-3 text-[length:var(--fs-text)] text-bw-text-muted">
          Noch keine Visualisierung.
        </p>
      ) : null}

      {imAngebot.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-primary">Im Angebot (PDF)</p>
          {imAngebot.map((s) => {
            const { istUrl, nachherUrl } = sessionVorschau(s)
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-bw-primary/25 bg-bw-primary/5 p-2"
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
                <div className="min-w-0 flex-1 text-[length:var(--fs-meta)] text-bw-text-muted">
                  {formatDatumZeit(s.created_at)}
                  {s.prompt_history.length > 1 ? ` · ${s.prompt_history.length} Versionen` : ''}
                </div>
                <MockBtn
                  type="button"
                  kind="ghost"
                  sm
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
                </MockBtn>
              </div>
            )
          })}
        </div>
      ) : null}

      {!loading && andere.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Weitere Sessions</p>
          {andere.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-[length:var(--fs-meta)]">
              <span className="text-bw-text-muted">{formatDatumZeit(s.created_at)} · {s.status}</span>
              <MockBtn
                type="button"
                kind="ghost"
                sm
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
              </MockBtn>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
