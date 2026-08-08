'use client'

import { Activity, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { KiAngebotAbgleichCard } from '@/components/ki/KiAngebotAbgleichCard'
import { KiAusfuehrungCard } from '@/components/ki/KiAusfuehrungCard'
import { KiBewertungenCard } from '@/components/ki/KiBewertungenCard'
import { KiDauerBautagebuchCard } from '@/components/ki/KiDauerBautagebuchCard'
import { KiFunnelBanner } from '@/components/ki/KiFunnelBanner'
import { KiGewerkeAblaufCard } from '@/components/ki/KiGewerkeAblaufCard'
import { KiHandwerkerCard } from '@/components/ki/KiHandwerkerCard'
import { KiKommunikationCard } from '@/components/ki/KiKommunikationCard'
import { KiNachfrageCard } from '@/components/ki/KiNachfrageCard'
import { KiPreiseMargenCard } from '@/components/ki/KiPreiseMargenCard'
import { KiProdukteCard } from '@/components/ki/KiProdukteCard'
import { buildKiAnalyticsMeta } from '@/lib/ki/analytics-meta'
import {
  KI_BEREICHE,
  KI_BEREICH_ORDER,
  KI_PHASEN,
  type KiBereich,
} from '@/lib/ki/constants'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { cn } from '@/lib/utils'

type Props = {
  analysen: KiClusterAnalyseRow[]
}

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

export function KiHubLebenszyklusPanel({ analysen }: Props) {
  const router = useRouter()
  const [phaseId, setPhaseId] = useState(KI_PHASEN[0]!.id)
  const [bereich, setBereich] = useState<KiBereich>(KI_PHASEN[0]!.bereiche[0]!)
  const [loading, setLoading] = useState(false)
  const [kiLoading, setKiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byBereich = useMemo(() => {
    const map = new Map<string, KiClusterAnalyseRow>()
    for (const row of analysen) map.set(row.bereich, row)
    return map
  }, [analysen])

  const meta = useMemo(() => buildKiAnalyticsMeta(analysen), [analysen])
  const phase = KI_PHASEN.find((p) => p.id === phaseId) ?? KI_PHASEN[0]!

  useEffect(() => {
    if (!phase.bereiche.includes(bereich)) {
      setBereich(phase.bereiche[0]!)
    }
  }, [phase, bereich])

  const selected = byBereich.get(bereich)

  const refreshKi = useCallback(async () => {
    setKiLoading(true)
    setLoading(true)
    setError(null)
    try {
      await postRefresh('claude')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
      setKiLoading(false)
    }
  }, [router])

  const refreshZahlen = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      for (const key of KI_BEREICH_ORDER) {
        await postRefresh(key)
      }
      await postRefresh('claude')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }, [router])

  return (
    <section id="ki-depth" className="rounded-xl border border-bw-border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bw-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-bw-text">
            <Activity className="h-4 w-4 text-[#2E7D52]" aria-hidden />
            Lebenszyklus-Analyse
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            5 Phasen · Ableitungen aus CRM-Daten · KI-Texte {meta.kiTexteAnzahl} /{' '}
            {meta.kiTexteGesamt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshZahlen()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bw-border px-2.5 py-1.5 text-xs font-medium text-bw-text hover:bg-bw-bg disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#7C5CFC]" aria-hidden />
          {loading ? 'Aktualisiert…' : 'Ableitungen aktualisieren'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-bw-border px-4 py-3">
        {KI_PHASEN.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPhaseId(p.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
              phaseId === p.id
                ? 'bg-[#2E7D52] text-white'
                : 'bg-bw-bg text-bw-text hover:bg-bw-surface-2'
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                phaseId === p.id ? 'bg-white/20' : 'bg-white text-[#2E7D52]'
              )}
            >
              {i + 1}
            </span>
            {p.label.replace(/^[①②③④⑤]\s*/, '')}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {analysen.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm font-medium text-bw-text">Noch keine Auswertung</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Starte die erste Auswertung — danach erscheinen Cluster-Grafiken und KI-Ableitungen.
          </p>
          <button
            type="button"
            onClick={() => void refreshZahlen()}
            disabled={loading}
            className="mt-4 rounded-lg bg-[#2E7D52] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Erste Auswertung starten
          </button>
        </div>
      ) : (
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-bw-border p-3 md:flex-col md:overflow-visible md:border-b-0 md:border-r"
            aria-label="Analyse-Bereiche"
          >
            {phase.bereiche.map((b) => {
              const hasNarrative = Boolean(byBereich.get(b)?.narrative?.trim())
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBereich(b)}
                  className={cn(
                    'flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors md:w-full',
                    bereich === b
                      ? 'bg-[#EAF3DE] text-[#2E7D52]'
                      : 'text-bw-text hover:bg-bw-bg'
                  )}
                >
                  <span className="truncate">{KI_BEREICHE[b]}</span>
                  {hasNarrative ? (
                    <Sparkles className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 p-3 md:p-4">
            {selected ? (
              renderAnalyse(selected, () => void refreshKi(), kiLoading)
            ) : (
              <div className="rounded-xl border border-dashed border-bw-border bg-bw-bg px-4 py-10 text-center">
                <p className="text-sm font-medium text-bw-text">Keine Daten für diesen Bereich</p>
                <p className="mt-1 text-sm text-muted">Ableitungen aktualisieren, um neu zu laden.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
