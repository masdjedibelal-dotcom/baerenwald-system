'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { KI_BEREICHE, KI_BEREICH_ORDER, KI_PHASEN } from '@/lib/ki/constants'
import { buildKiAnalyticsMeta } from '@/lib/ki/analytics-meta'
import { phaseSummary } from '@/lib/ki/phase-summaries'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiAnalyticsStatusBar } from '@/components/ki/KiAnalyticsStatusBar'
import { KiJourneyBand } from '@/components/ki/KiJourneyBand'
import { KiPhaseSection } from '@/components/ki/KiPhaseSection'
import { KiAngebotAbgleichCard } from '@/components/ki/KiAngebotAbgleichCard'
import { KiAusfuehrungCard } from '@/components/ki/KiAusfuehrungCard'
import { KiBewertungenCard } from '@/components/ki/KiBewertungenCard'
import { KiDauerBautagebuchCard } from '@/components/ki/KiDauerBautagebuchCard'
import { KiFunnelBanner } from '@/components/ki/KiFunnelBanner'
import { KiGewerkeAblaufCard } from '@/components/ki/KiGewerkeAblaufCard'
import { KiNachfrageCard } from '@/components/ki/KiNachfrageCard'
import { KiProdukteCard } from '@/components/ki/KiProdukteCard'
import { KiHandwerkerCard } from '@/components/ki/KiHandwerkerCard'
import { KiKommunikationCard } from '@/components/ki/KiKommunikationCard'
import { KiPreiseMargenCard } from '@/components/ki/KiPreiseMargenCard'

type Props = {
  analysen: KiClusterAnalyseRow[]
}

type Progress = { current: number; total: number; label: string }

async function postRefresh(bereich: string) {
  const res = await fetch('/api/ki/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bereich }),
  })
  const json = (await res.json()) as { error?: string }
  if (!res.ok) throw new Error(json.error ?? 'Aktualisierung fehlgeschlagen')
}

function renderAnalyse(
  analyse: KiClusterAnalyseRow,
  onGenerateKi: () => void,
  kiLoading: boolean
) {
  const props = { analyse, onGenerateKi, kiLoading }
  switch (analyse.bereich) {
    case 'funnel':
      return <KiFunnelBanner key={analyse.id} {...props} />
    case 'nachfrage':
      return <KiNachfrageCard key={analyse.id} {...props} />
    case 'kommunikation':
      return <KiKommunikationCard key={analyse.id} {...props} />
    case 'angebot_abgleich':
      return <KiAngebotAbgleichCard key={analyse.id} {...props} />
    case 'preise_margen':
      return <KiPreiseMargenCard key={analyse.id} {...props} />
    case 'handwerker':
      return <KiHandwerkerCard key={analyse.id} {...props} />
    case 'gewerke':
      return <KiGewerkeAblaufCard key={analyse.id} {...props} />
    case 'ausfuehrung':
      return <KiAusfuehrungCard key={analyse.id} {...props} />
    case 'dauer':
      return <KiDauerBautagebuchCard key={analyse.id} {...props} />
    case 'bewertungen':
      return <KiBewertungenCard key={analyse.id} {...props} />
    case 'produkte':
      return <KiProdukteCard key={analyse.id} {...props} />
    default:
      return null
  }
}

export function KiAnalyticsClient({ analysen }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [kiOnlyLoading, setKiOnlyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)

  const byBereich = useMemo(() => {
    const map = new Map<string, KiClusterAnalyseRow>()
    for (const row of analysen) map.set(row.bereich, row)
    return map
  }, [analysen])

  const meta = useMemo(() => buildKiAnalyticsMeta(analysen), [analysen])

  const runBereiche = useCallback(
    async (keys: string[]) => {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]!
        setProgress({
          current: i + 1,
          total: keys.length,
          label: KI_BEREICHE[key as keyof typeof KI_BEREICHE] ?? key,
        })
        await postRefresh(key)
      }
    },
    []
  )

  const finish = useCallback(() => {
    setProgress(null)
    router.refresh()
  }, [router])

  async function refreshZahlen(keys = KI_BEREICH_ORDER) {
    setLoading(true)
    setError(null)
    try {
      await runBereiche(keys)
      finish()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  async function refreshKi() {
    setKiOnlyLoading(true)
    setLoading(true)
    setError(null)
    try {
      setProgress({ current: 1, total: 1, label: 'KI-Texte' })
      await postRefresh('claude')
      finish()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
      setKiOnlyLoading(false)
      setProgress(null)
    }
  }

  async function refreshBeides() {
    setLoading(true)
    setError(null)
    try {
      await runBereiche(KI_BEREICH_ORDER)
      setProgress({ current: 1, total: 1, label: 'KI-Texte' })
      await postRefresh('claude')
      finish()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  function refreshPhase(phaseId: string) {
    const phase = KI_PHASEN.find((p) => p.id === phaseId)
    if (!phase) return
    void refreshZahlen(phase.bereiche)
  }

  function jumpToPhase(phaseId: string) {
    document.getElementById(`ki-phase-${phaseId}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  const onGenerateKi = () => void refreshKi()

  const isEmpty = analysen.length === 0

  return (
    <div className="space-y-6">
      <KiAnalyticsStatusBar
        meta={meta}
        loading={loading}
        progress={progress}
        onRefreshZahlen={() => void refreshZahlen()}
        onRefreshKi={() => void refreshKi()}
        onRefreshBeides={() => void refreshBeides()}
      />

      {!isEmpty ? <KiJourneyBand meta={meta} onJump={jumpToPhase} /> : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-bw-border bg-bw-bg px-4 py-12 text-center">
          <p className="text-sm font-medium text-bw-text">Noch keine Auswertung gespeichert</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Eure CRM-Daten sind da — klickt auf „Zahlen“, um die erste Auswertung zu erstellen.
          </p>
          <button
            type="button"
            onClick={() => void refreshBeides()}
            disabled={loading}
            className="mt-4 rounded-lg bg-bw-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Erste Auswertung starten
          </button>
        </div>
      ) : (
        KI_PHASEN.map((phase) => {
          const phaseAnalysen = phase.bereiche
            .map((b) => byBereich.get(b))
            .filter(Boolean) as KiClusterAnalyseRow[]
          return (
            <KiPhaseSection
              key={phase.id}
              phase={phase}
              summary={phaseSummary(phase, byBereich)}
              loading={loading}
              onRefreshPhase={refreshPhase}
              hasData={phaseAnalysen.length > 0}
            >
              <div className="space-y-4">
                {phaseAnalysen.map((a) => renderAnalyse(a, onGenerateKi, kiOnlyLoading))}
              </div>
            </KiPhaseSection>
          )
        })
      )}
    </div>
  )
}
