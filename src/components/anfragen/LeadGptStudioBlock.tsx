'use client'

import { ChevronDown, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureGptZielbildForLead } from '@/app/(dashboard)/anfragen/gpt-viz-actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  gptGalerieUrls,
  gptHeroBildUrl,
  parseGptProjektStudioFunnel,
} from '@/lib/gpt-viz/funnel-daten'
import type { GptProjektStudioFunnelDaten } from '@/lib/gpt-viz/types'
import type { LeadDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

function GptProp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{children}</div>
    </div>
  )
}

export function LeadGptStudioBlock({
  lead,
  onUpdated,
}: {
  lead: LeadDetail
  onUpdated?: () => void
}) {
  const initial = useMemo(() => parseGptProjektStudioFunnel(lead.funnel_daten), [lead.funnel_daten])
  const [studio, setStudio] = useState<GptProjektStudioFunnelDaten | null>(initial)
  const [heroUrl, setHeroUrl] = useState<string | null>(() =>
    initial ? gptHeroBildUrl(initial) : null
  )
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setStudio(initial)
    setHeroUrl(initial ? gptHeroBildUrl(initial) : null)
  }, [initial])

  useEffect(() => {
    if (!initial?.gpt_session_id || initial.zielbild_url?.trim()) return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    void ensureGptZielbildForLead(lead.id)
      .then((r) => {
        if (cancelled) return
        if (!r.ok) {
          setFetchError(r.message)
          return
        }
        if (r.zielbild_url) {
          setHeroUrl(r.zielbild_url)
          setStudio((prev) => (prev ? { ...prev, zielbild_url: r.zielbild_url } : prev))
          if (!r.from_cache) onUpdated?.()
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lead.id, initial, onUpdated])

  if (!studio) return null

  const erk = studio.gpt_erklaerung
  const galerie = gptGalerieUrls(studio).filter((u) => u !== heroUrl)
  const chat = studio.ki_chat_verlauf ?? []

  async function zielbildNeuLaden() {
    setLoading(true)
    setFetchError(null)
    const r = await ensureGptZielbildForLead(lead.id, { force: true })
    setLoading(false)
    if (!r.ok) {
      setFetchError(r.message)
      return
    }
    if (r.zielbild_url) {
      setHeroUrl(r.zielbild_url)
      setStudio((prev) => (prev ? { ...prev, zielbild_url: r.zielbild_url } : prev))
      onUpdated?.()
    }
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#2E7D52]" aria-hidden />
          KI-Projekt (GPT Studio)
        </span>
      }
      action={
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={loading}
          onClick={() => void zielbildNeuLaden()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Zielbild laden'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-bw-border bg-[#0F2818]">
          {loading && !heroUrl ? (
            <div className="flex aspect-[4/5] max-h-[min(70vh,540px)] items-center justify-center text-sm text-[#B8D4C4]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              Zielbild wird geladen…
            </div>
          ) : heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt="GPT Zielbild"
              className="mx-auto block aspect-[4/5] max-h-[min(70vh,540px)] w-full object-contain"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center px-4 text-center text-sm text-[#B8D4C4]">
              {fetchError ?? 'Kein Zielbild verfügbar'}
            </div>
          )}
        </div>

        {fetchError && heroUrl ? (
          <p className="text-xs text-status-cancel-text">{fetchError}</p>
        ) : null}

        {erk ? (
          <div className="space-y-3">
            {erk.zielbild_kicker ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2E7D52]">
                {erk.zielbild_kicker}
              </p>
            ) : null}
            <h3 className="font-serif text-xl font-bold leading-snug text-bw-text">
              {erk.zielbild_headline || erk.titel}
            </h3>
            {erk.zielbild_teaser ? (
              <p className="font-serif text-[15px] italic text-bw-text-muted">{erk.zielbild_teaser}</p>
            ) : null}
            {erk.zusammenfassung ? (
              <p className="text-[13px] leading-relaxed text-bw-text-muted">{erk.zusammenfassung}</p>
            ) : null}

            {erk.gewerke.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-bw-text">Gewerke</p>
                <ul className="space-y-1 text-[13px] text-bw-text-muted">
                  {erk.gewerke.map((g) => (
                    <li key={g.name}>
                      <span className="font-medium text-bw-text">{g.name}</span>
                      {g.beschreibung ? ` — ${g.beschreibung}` : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {erk.naechste_schritte.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-bw-text">Nächste Schritte</p>
                <ol className="list-decimal space-y-0.5 pl-4 text-[13px] text-bw-text-muted">
                  {erk.naechste_schritte.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : studio.wunsch_text ? (
          <p className="text-[13px] leading-relaxed text-bw-text-muted">{studio.wunsch_text}</p>
        ) : null}

        {galerie.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-bw-text">Bilder</p>
            <div className="flex flex-wrap gap-2">
              {galerie.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block h-20 w-20 overflow-hidden rounded-lg border border-bw-border"
                  title="Bild öffnen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                    <ExternalLink className="h-4 w-4 text-white" aria-hidden />
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <details className="group rounded-lg border border-bw-border bg-bw-bg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-bw-text marker:content-none [&::-webkit-details-marker]:hidden">
            <span>Technische Details</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-bw-text-muted transition group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-bw-border px-3 py-2">
            <div className="props text-[13px]">
              <GptProp label="Session">{studio.gpt_session_id}</GptProp>
              {studio.wunsch_text ? <GptProp label="Wunsch">{studio.wunsch_text}</GptProp> : null}
              {typeof studio.render_count === 'number' ? (
                <GptProp label="Renders">{studio.render_count}</GptProp>
              ) : null}
            </div>
          </div>
        </details>

        {chat.length > 0 ? (
          <details className="group rounded-lg border border-bw-border bg-bw-bg">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-bw-text marker:content-none [&::-webkit-details-marker]:hidden">
              <span>KI-Chat ({chat.length})</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-bw-text-muted transition group-open:rotate-180')}
                aria-hidden
              />
            </summary>
            <div className="max-h-80 space-y-2 overflow-y-auto border-t border-bw-border px-3 py-2">
              {chat.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    'rounded-lg px-3 py-2 text-[13px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-white text-bw-text'
                      : 'bg-[#EAF3DE] text-[#1A3D2B]'
                  )}
                >
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {m.role === 'user' ? 'Kunde' : 'GPT'}
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  )
}
