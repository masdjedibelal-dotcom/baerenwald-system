'use client'

import { ChevronDown, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureLeadVertriebsAnalyse } from '@/app/(dashboard)/anfragen/actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { gptGalerieUrls, isGptProjektStudio, parseGptProjektStudioFunnel } from '@/lib/gpt-viz/funnel-daten'
import type { LeadDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

export function leadHatKiVertriebsDaten(lead: Pick<LeadDetail, 'funnel_daten' | 'ki_session_id'>): boolean {
  return isGptProjektStudio(lead.funnel_daten) || Boolean(lead.ki_session_id?.trim())
}

function AnalyseAbschnitt({ text }: { text: string }) {
  const blocks = text.split(/\n(?=\*\*)/).filter(Boolean)
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-bw-text">
      {blocks.map((block, i) => {
        const m = block.match(/^\*\*(.+?)\*\*\n?([\s\S]*)$/)
        if (m) {
          const body = m[2].trim()
          const lines = body.split('\n').filter(Boolean)
          const isList = lines.every((l) => l.startsWith('- '))
          return (
            <div key={i}>
              <p className="mb-1 text-xs font-semibold text-bw-text">{m[1]}</p>
              {isList ? (
                <ul className="list-disc space-y-0.5 pl-4 text-bw-text-muted">
                  {lines.map((l) => (
                    <li key={l}>{l.replace(/^- /, '')}</li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap text-bw-text-muted">{body}</p>
              )}
            </div>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-bw-text-muted">
            {block.trim()}
          </p>
        )
      })}
    </div>
  )
}

function VertriebBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-bw-text">{title}</p>
      <div className="text-[13px] leading-relaxed text-bw-text-muted">{children}</div>
    </div>
  )
}

export function LeadGptStudioBlock({ lead }: { lead: LeadDetail }) {
  const studio = useMemo(() => parseGptProjektStudioFunnel(lead.funnel_daten), [lead.funnel_daten])
  const istGpt = Boolean(studio)

  const [analyse, setAnalyse] = useState(lead.ki_zusammenfassung?.trim() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAnalyse(lead.ki_zusammenfassung?.trim() ?? '')
  }, [lead.ki_zusammenfassung])

  useEffect(() => {
    if (analyse.trim()) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void ensureLeadVertriebsAnalyse(lead.id)
      .then((r) => {
        if (cancelled) return
        if (!r.ok) {
          setError(r.message)
          return
        }
        setAnalyse(r.text)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lead.id, analyse])

  async function analyseAktualisieren() {
    setLoading(true)
    setError(null)
    const r = await ensureLeadVertriebsAnalyse(lead.id, { force: true })
    setLoading(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setAnalyse(r.text)
  }

  if (!leadHatKiVertriebsDaten(lead)) return null

  const erk = studio?.gpt_erklaerung
  const galerie = studio ? gptGalerieUrls(studio) : []
  const chat = studio?.ki_chat_verlauf ?? []
  const quelleLabel =
    studio?.funnel_quelle === 'gpt_raumvisualisierung'
      ? 'Raumvisualisierung'
      : studio?.funnel_quelle === 'gpt_kombiniert'
        ? 'Beratung + Visualisierung'
        : studio?.funnel_quelle === 'gpt_beratung'
          ? 'KI-Beratung'
          : lead.ki_session_id
            ? 'KI-Rechner'
            : 'Website-KI'

  return (
    <Card
      collapsible={false}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#2E7D52]" aria-hidden />
          {istGpt ? 'KI-Anfrage (Website)' : 'KI-Rechner'}
        </span>
      }
      action={
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={loading}
          onClick={() => void analyseAktualisieren()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Analyse aktualisieren
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        {istGpt ? (
          <p className="text-[13px] leading-relaxed text-bw-text-muted">
            Quelle: <span className="font-medium text-bw-text">{quelleLabel}</span> — Chat, Eingaben und
            Visualisierung werden für Vertriebstipps ausgewertet.
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-bw-text-muted">
            Anfrage über den <span className="font-medium text-bw-text">KI-Rechner</span> auf der Website.
            Eingaben und Chat-Verlauf fließen in die Analyse ein.
          </p>
        )}

        <div className="space-y-3 rounded-lg border border-[#2E7D52]/25 bg-[#EAF3DE]/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2E7D52]">
            Vertriebs-Analyse
          </p>

          {loading && !analyse ? (
            <div className="flex items-center gap-2 text-sm text-bw-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chat und Website-Verhalten werden ausgewertet…
            </div>
          ) : analyse ? (
            <AnalyseAbschnitt text={analyse} />
          ) : (
            <p className="text-[13px] text-bw-text-muted">
              {error ?? 'Noch keine Analyse — bitte „Analyse aktualisieren“ klicken.'}
            </p>
          )}

          {error && analyse ? (
            <p className="text-xs text-status-cancel-text">{error}</p>
          ) : null}
        </div>

        {!analyse && erk && !loading ? (
          <div className="space-y-3 rounded-lg border border-bw-border bg-bw-bg p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
              Rohdaten (Website)
            </p>
            {erk.zusammenfassung ? (
              <VertriebBlock title="Projekt">
                <p>{erk.zusammenfassung}</p>
              </VertriebBlock>
            ) : null}
            {erk.naechste_schritte.length > 0 ? (
              <VertriebBlock title="Hinweise Website">
                <ol className="list-decimal space-y-0.5 pl-4">
                  {erk.naechste_schritte.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </VertriebBlock>
            ) : null}
          </div>
        ) : null}

        {galerie.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-bw-text">Kundenfotos (Website)</p>
            <div className="flex flex-wrap gap-2">
              {galerie.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block h-16 w-16 overflow-hidden rounded-lg border border-bw-border"
                  title="Bild öffnen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5 text-white" aria-hidden />
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {chat.length > 0 ? (
          <details className="group rounded-lg border border-bw-border bg-bw-bg">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-bw-text marker:content-none [&::-webkit-details-marker]:hidden">
              <span>Chat-Verlauf ({chat.length})</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-bw-text-muted transition group-open:rotate-180')}
                aria-hidden
              />
            </summary>
            <div className="max-h-64 space-y-2 overflow-y-auto border-t border-bw-border px-3 py-2">
              {chat.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    'rounded-lg px-3 py-2 text-[13px] leading-relaxed',
                    m.role === 'user' ? 'bg-white text-bw-text' : 'bg-[#EAF3DE] text-[#1A3D2B]'
                  )}
                >
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {m.role === 'user' ? 'Kunde' : 'KI'}
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
