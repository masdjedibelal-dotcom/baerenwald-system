'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import type { KiAnalyticsMeta } from '@/lib/ki/analytics-meta'

type Progress = { current: number; total: number; label: string } | null

type Props = {
  meta: KiAnalyticsMeta
  loading: boolean
  progress: Progress
  onRefreshZahlen: () => void
  onRefreshKi: () => void
  onRefreshBeides: () => void
}

export function KiAnalyticsStatusBar({
  meta,
  loading,
  progress,
  onRefreshZahlen,
  onRefreshKi,
  onRefreshBeides,
}: Props) {
  const kiFehlt = meta.kiTexteGesamt - meta.kiTexteAnzahl

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-bw-border bg-white px-4 py-4 md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fs-caption font-semibold uppercase tracking-wider text-bw-primary">
            <MockIcon n="sparkles" ctx="default" className="h-3.5 w-3.5" aria-hidden />
            KI Analytics
          </p>
          {meta.leadsGesamt != null ? (
            <p className="mt-1 text-sm text-bw-text">
              {meta.leadsGesamt} Anfragen · {meta.leadsMitAngebot ?? '—'} mit Angebot ·{' '}
              {meta.auftraegeGesamt ?? '—'} Aufträge
              {meta.conversionAnfrageAngebot != null ? (
                <span className="text-muted"> · {meta.conversionAnfrageAngebot}% Conversion</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Noch keine Auswertung — Zahlen aktualisieren.</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Zahlen: {meta.zahlenAktualisiertLabel} · KI-Texte: {meta.kiTexteAnzahl}/
            {meta.kiTexteGesamt}
            {kiFehlt > 0 ? (
              <span className="text-status-contact-text"> · {kiFehlt} fehlen</span>
            ) : null}
          </p>
          {loading && progress ? (
            <p className="mt-2 text-xs font-medium text-bw-primary">
              {progress.current}/{progress.total} — {progress.label}…
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MockBtn
            type="button"
            kind="primary"
            sm
            loading={loading}
            onClick={onRefreshKi}
          >
            <MockIcon n="sparkles" ctx="default" className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} aria-hidden />
            KI-Texte
          </MockBtn>
          <MockBtn
            type="button"
            kind="secondary"
            sm
            loading={loading}
            onClick={onRefreshZahlen}
          >
            Zahlen
          </MockBtn>
          <MockBtn
            type="button"
            kind="ghost"
            sm
            disabled={loading}
            onClick={onRefreshBeides}
            className="text-xs underline"
          >
            Beides
          </MockBtn>
        </div>
      </div>
    </div>
  )
}
