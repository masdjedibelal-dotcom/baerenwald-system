'use client'

import { RefreshCw, Sparkles } from 'lucide-react'
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
    <div className="sticky top-0 z-20 -mx-4 border-b border-bw-border bg-bw-card/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
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
              <span className="text-amber-700"> · {kiFehlt} fehlen</span>
            ) : null}
          </p>
          {loading && progress ? (
            <p className="mt-2 text-xs font-medium text-[#2E7D52]">
              {progress.current}/{progress.total} — {progress.label}…
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefreshKi}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-bw-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} aria-hidden />
            KI-Texte
          </button>
          <button
            type="button"
            onClick={onRefreshZahlen}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 py-2 text-sm font-medium text-bw-text hover:bg-bw-bg disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Zahlen
          </button>
          <button
            type="button"
            onClick={onRefreshBeides}
            disabled={loading}
            className="text-xs text-muted underline hover:text-bw-text disabled:opacity-50"
          >
            Beides
          </button>
        </div>
      </div>
    </div>
  )
}
