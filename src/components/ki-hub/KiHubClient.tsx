'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useCallback, useEffect, useState } from 'react'
import { KiHubEmpfehlungenPanel } from '@/components/ki-hub/KiHubEmpfehlungenPanel'
import { KiHubLebenszyklusPanel } from '@/components/ki-hub/KiHubLebenszyklusPanel'
import { fetchJsonSafe } from '@/lib/ki-hub/fetch-json'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import type {
  KiHubEmpfehlungenGrouped,
  KiHubLoadPayload,
} from '@/lib/ki-hub/types'
import { cn } from '@/lib/utils'
import { formatDatumZeit } from '@/lib/format/geld-datum'

type HubResponse = {
  ok: boolean
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
    return formatDatumZeit(String(iso))
  } catch {
    return '—'
  }
}

function quellenDots(data: KiHubLoadPayload | undefined): {
  label: string
  ok: boolean
}[] {
  if (!data) {
    return [
      { label: 'CRM', ok: true },
      { label: 'PostHog', ok: false },
      { label: 'Resend', ok: false },
      { label: 'Netlify', ok: false },
      { label: 'GSC', ok: false },
    ]
  }
  return [
    { label: 'CRM', ok: true },
    { label: 'PostHog', ok: data.marketing.posthog.status === 'ok' },
    { label: 'Resend', ok: data.marketing.resend.status === 'ok' },
    { label: 'Netlify', ok: data.technik.netlify.status === 'ok' },
    { label: 'GSC', ok: data.marketing.google.status === 'ok' },
  ]
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
  const [empfehlungen, setEmpfehlungen] = useState<KiHubEmpfehlungenGrouped>(EMPTY_GROUP)
  const [analyseLauf, setAnalyseLauf] = useState<string | null>(null)
  const [rawData, setRawData] = useState<KiHubLoadPayload | undefined>()

  const applyResponse = useCallback((json: HubResponse) => {
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
        `Quellen geladen — KI-Analyse: ${e instanceof Error ? e.message : 'Fehler'}`
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

  const dots = quellenDots(rawData)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-bw-text">
            <MockIcon n="sparkles" ctx="default" className="h-5 w-5 text-status-new-text" aria-hidden />
            KI Analytics
          </h1>
          <p className="mt-1 text-sm text-bw-text">
            Zuletzt analysiert: {formatZeit(analyseLauf)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {dots.map((d) => (
              <span
                key={d.label}
                className="inline-flex items-center gap-1.5 text-fs-caption text-muted"
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-pill',
                    d.ok ? 'bg-bw-success' : 'bg-status-contact-bg'
                  )}
                  aria-hidden
                />
                {d.label}
              </span>
            ))}
          </div>
          {analyzing ? (
            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-status-new-text">
              <span className="h-2 w-2 animate-pulse rounded-pill bg-status-new-bg" />
              Claude analysiert…
            </p>
          ) : null}
        </div>
        <MockBtn
          type="button"
          kind="primary"
          loading={loading || analyzing}
          onClick={() => void handleRefresh()}
        >
          Aktualisieren
        </MockBtn>
      </div>

      {error ? (
        <p className="rounded-button border border-status-cancel-bg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
          {error}
        </p>
      ) : null}

      <KiHubEmpfehlungenPanel
        empfehlungen={empfehlungen}
        loading={loading}
        analyzing={analyzing}
        onMarkDone={handleMarkDone}
        onFirstAnalyze={() => void handleFirstAnalyze()}
      />

      <KiHubLebenszyklusPanel analysen={initialAnalysen} />
    </div>
  )
}
