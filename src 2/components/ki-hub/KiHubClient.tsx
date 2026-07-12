'use client'

import { RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ContentCard } from '@/components/ki-hub/ContentCard'
import { EmpfehlungCard } from '@/components/ki-hub/EmpfehlungCard'
import { KiHubDepthPanel } from '@/components/ki-hub/KiHubDepthPanel'
import { KiHubGelerntSection } from '@/components/ki-hub/KiHubGelerntSection'
import { KiHubMarktTrendsSection } from '@/components/ki-hub/KiHubMarktTrendsSection'
import { KiHubMarketingPanel } from '@/components/ki-hub/KiHubMarketingPanel'
import { KiHubPulseGrid } from '@/components/ki-hub/KiHubPulseGrid'
import { fetchJsonSafe } from '@/lib/ki-hub/fetch-json'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import type {
  KiHubEmpfehlungenGrouped,
  KiHubLoadPayload,
  KiHubPulseCard,
} from '@/lib/ki-hub/types'

type HubResponse = {
  ok: boolean
  pulse?: KiHubPulseCard[]
  empfehlungen?: KiHubEmpfehlungenGrouped
  analyse_lauf?: string | null
  timestamp?: string
  data?: KiHubLoadPayload
  error?: string
}

type Props = {
  initialAnalysen: KiClusterAnalyseRow[]
}

function formatZeit(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function quellenStatus(data: KiHubLoadPayload | undefined): string {
  if (!data) return ''
  const parts = [
    'CRM ✓',
    data.marketing.posthog.status === 'ok' ? 'PostHog ✓' : 'PostHog ~',
    data.marketing.resend.status === 'ok' ? 'Resend ✓' : 'Resend ~',
    data.technik.netlify.status === 'ok' ? 'Netlify ✓' : 'Netlify ~',
    data.marketing.google.status === 'ok' ? 'GSC ✓' : 'GSC ~',
  ]
  return parts.join(' · ')
}

const EMPTY_GROUP: KiHubEmpfehlungenGrouped = {
  kritisch: [],
  heute: [],
  markt: [],
  marketing: [],
  beobachten: [],
  gelernt: [],
}

export function KiHubClient({ initialAnalysen }: Props) {
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState<KiHubPulseCard[]>([])
  const [empfehlungen, setEmpfehlungen] = useState<KiHubEmpfehlungenGrouped>(EMPTY_GROUP)
  const [analyseLauf, setAnalyseLauf] = useState<string | null>(null)
  const [rawData, setRawData] = useState<KiHubLoadPayload | undefined>()
  const [depthOpen, setDepthOpen] = useState(false)

  const hasEmpfehlungen =
    empfehlungen.kritisch.length +
      empfehlungen.heute.length +
      empfehlungen.markt.length +
      empfehlungen.marketing.length +
      empfehlungen.beobachten.length +
      empfehlungen.gelernt.length >
    0

  const applyResponse = useCallback((json: HubResponse) => {
    if (json.pulse) setPulse(json.pulse)
    if (json.empfehlungen) setEmpfehlungen(json.empfehlungen)
    if (json.analyse_lauf !== undefined) setAnalyseLauf(json.analyse_lauf)
    if (json.data) setRawData(json.data)
  }, [])

  const loadHub = useCallback(async () => {
    const res = await fetch('/api/ki-hub/load')
    const parsed = await fetchJsonSafe<HubResponse>(res)
    if (!parsed.ok) throw new Error(parsed.message)
    const json = parsed.data
    if (!res.ok) throw new Error(json.error ?? 'Laden fehlgeschlagen')
    applyResponse(json)
    return json
  }, [applyResponse])

  const runAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ki-hub/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const parsed = await fetchJsonSafe<HubResponse>(res)
      if (!parsed.ok) throw new Error(parsed.message)
      const json = parsed.data
      if (!res.ok) throw new Error(json.error ?? 'Analyse fehlgeschlagen')
      applyResponse(json)
    } finally {
      setAnalyzing(false)
    }
  }, [applyResponse])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await loadHub()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadHub])

  async function handleRefresh() {
    setError(null)
    setLoading(true)
    try {
      await loadHub()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen')
      setLoading(false)
      return
    }
    setLoading(false)

    try {
      await runAnalyze()
    } catch (e) {
      setError(
        `Daten & KPIs geladen — KI-Analyse: ${e instanceof Error ? e.message : 'Fehler'}`
      )
    }
  }

  async function handleFirstAnalyze() {
    setError(null)
    setLoading(true)
    try {
      await loadHub()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen')
      setLoading(false)
      return
    }
    setLoading(false)

    try {
      await runAnalyze()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyse fehlgeschlagen')
    }
  }

  async function handleMarkDone(id: string) {
    const res = await fetch('/api/ki-hub/action/mark-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empfehlung_id: id }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) throw new Error(json.error ?? 'Fehler')
    setEmpfehlungen((prev) => ({
      kritisch: prev.kritisch.filter((e) => e.id !== id),
      heute: prev.heute.filter((e) => e.id !== id),
      markt: prev.markt.filter((e) => e.id !== id),
      marketing: prev.marketing.filter((e) => e.id !== id),
      beobachten: prev.beobachten.filter((e) => e.id !== id),
      gelernt: prev.gelernt.filter((e) => e.id !== id),
    }))
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-bw-border bg-bw-card/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              KI Hub
            </p>
            <p className="mt-1 text-sm text-bw-text">
              Zuletzt analysiert: {formatZeit(analyseLauf)}
            </p>
            {rawData ? (
              <p className="mt-1 text-xs text-muted">Daten: {quellenStatus(rawData)}</p>
            ) : null}
            {analyzing ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#2E7D52]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#2E7D52]" />
                Claude analysiert…
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || analyzing}
            className="inline-flex items-center gap-2 rounded-lg border border-bw-border bg-white px-3 py-2 text-sm font-medium hover:bg-bw-bg disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading || analyzing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && !pulse.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-bw-border bg-bw-bg"
            />
          ))}
        </div>
      ) : (
        <KiHubPulseGrid cards={pulse} />
      )}

      <KiHubMarketingPanel data={rawData} />

      <KiHubMarktTrendsSection
        items={empfehlungen.markt}
        analyseLauf={analyseLauf}
        analyzing={analyzing}
        onMarkDone={handleMarkDone}
      />

      {!loading && !hasEmpfehlungen && !analyzing ? (
        <div className="rounded-xl border border-dashed border-bw-border bg-bw-bg px-4 py-10 text-center">
          <p className="text-sm font-medium text-bw-text">Noch keine Hub-Analyse</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Starte die erste Analyse — CRM-Daten werden ausgewertet und priorisierte Empfehlungen
            erzeugt.
          </p>
          <button
            type="button"
            onClick={() => void handleFirstAnalyze()}
            className="mt-4 rounded-lg bg-bw-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Erste Analyse starten
          </button>
        </div>
      ) : null}

      {empfehlungen.kritisch.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-red-800">Kritisch</h2>
          <div className="space-y-3">
            {empfehlungen.kritisch.map((e) => (
              <EmpfehlungCard
                key={e.id}
                empfehlung={e}
                onMarkDone={handleMarkDone}
                onOpenDepth={() => setDepthOpen(true)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {empfehlungen.heute.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-bw-text">Heute tun</h2>
          <div className="space-y-3">
            {empfehlungen.heute.map((e) => (
              <EmpfehlungCard
                key={e.id}
                empfehlung={e}
                onMarkDone={handleMarkDone}
                onOpenDepth={() => setDepthOpen(true)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {empfehlungen.marketing.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-bw-text">Marketing-Content</h2>
          <div className="space-y-3">
            {empfehlungen.marketing.map((e) => (
              <ContentCard key={e.id} empfehlung={e} onMarkDone={handleMarkDone} />
            ))}
          </div>
        </section>
      ) : null}

      {empfehlungen.beobachten.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Beobachten</h2>
          <div className="space-y-3">
            {empfehlungen.beobachten.map((e) => (
              <EmpfehlungCard
                key={e.id}
                empfehlung={e}
                onMarkDone={handleMarkDone}
                onOpenDepth={() => setDepthOpen(true)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <KiHubGelerntSection items={empfehlungen.gelernt} />

      <KiHubDepthPanel
        analysen={initialAnalysen}
        open={depthOpen}
        onOpenChange={setDepthOpen}
      />
    </div>
  )
}
