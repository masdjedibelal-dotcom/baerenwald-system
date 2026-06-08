'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { KI_BEREICHE } from '@/lib/ki/constants'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiGewerkeAblaufCard } from '@/components/ki/KiGewerkeAblaufCard'
import { KiProdukteCard } from '@/components/ki/KiProdukteCard'
import { KiHandwerkerCard } from '@/components/ki/KiHandwerkerCard'
import { KiPreiseMargenCard } from '@/components/ki/KiPreiseMargenCard'

type Props = {
  analysen: KiClusterAnalyseRow[]
}

function renderAnalyse(analyse: KiClusterAnalyseRow) {
  if (analyse.bereich === 'preise_margen') {
    return <KiPreiseMargenCard key={analyse.id} analyse={analyse} />
  }
  if (analyse.bereich === 'handwerker') {
    return <KiHandwerkerCard key={analyse.id} analyse={analyse} />
  }
  if (analyse.bereich === 'gewerke') {
    return <KiGewerkeAblaufCard key={analyse.id} analyse={analyse} />
  }
  if (analyse.bereich === 'produkte') {
    return <KiProdukteCard key={analyse.id} analyse={analyse} />
  }
  return null
}

export function KiAnalyticsClient({ analysen }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byBereich = new Map<string, KiClusterAnalyseRow[]>()
  for (const row of analysen) {
    const list = byBereich.get(row.bereich) ?? []
    list.push(row)
    byBereich.set(row.bereich, list)
  }

  async function refresh(bereich = 'all') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ki/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bereich }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Aktualisierung fehlgeschlagen')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  const bereicheMitDaten = Array.from(byBereich.keys())
  const bereicheOhneDaten = Object.keys(KI_BEREICHE).filter((k) => !bereicheMitDaten.includes(k))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            KI Analytics
          </p>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Gespeicherte Analysen aus euren CRM-Daten — pro Bereich eine Auswertung. Aktualisierung
            manuell per Button (automatisch später per Cron).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refresh('all_claude')}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-bw-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Alles + KI-Auswertung
          </button>
          <button
            type="button"
            onClick={() => refresh('all')}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 py-2 text-sm font-medium text-bw-text hover:bg-bw-bg disabled:opacity-50"
          >
            Nur Zahlen
          </button>
          <button
            type="button"
            onClick={() => refresh('claude')}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#2E7D52]/30 bg-[#EAF3DE] px-3 py-2 text-sm font-medium text-[#2E7D52] hover:bg-[#EAF3DE]/80 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            KI-Text
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {bereicheMitDaten.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bw-border bg-bw-bg px-4 py-10 text-center">
          <p className="text-sm text-muted">Noch keine Analysen gespeichert.</p>
          <button
            type="button"
            onClick={() => refresh('all')}
            disabled={loading}
            className="mt-3 text-sm font-medium text-bw-primary hover:underline"
          >
            Erste Analysen starten
          </button>
        </div>
      ) : null}

      {bereicheMitDaten.map((bereich) => (
        <section key={bereich}>
          <h2 className="mb-3 text-base font-semibold text-bw-text">
            {KI_BEREICHE[bereich as keyof typeof KI_BEREICHE] ?? bereich}
          </h2>
          <div className="space-y-4">{(byBereich.get(bereich) ?? []).map(renderAnalyse)}</div>
        </section>
      ))}

      {bereicheOhneDaten.length > 0 ? (
        <section className="rounded-xl border border-bw-border bg-bw-bg/50 px-4 py-4">
          <h2 className="text-sm font-semibold text-muted">Geplant — noch keine Analyse</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {bereicheOhneDaten.map((key) => (
              <li
                key={key}
                className="rounded-full border border-bw-border bg-bw-card px-2.5 py-1 text-xs text-muted"
              >
                {KI_BEREICHE[key as keyof typeof KI_BEREICHE]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
