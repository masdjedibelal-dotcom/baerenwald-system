'use client'

import { ExternalLink, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureLeadVertriebsAnalyse } from '@/app/(dashboard)/anfragen/actions'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { gptGalerieUrls, isGptProjektStudio, parseGptProjektStudioFunnel } from '@/lib/gpt-viz/funnel-daten'
import type { LeadDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

export function leadHatKiVertriebsDaten(
  lead: Pick<LeadDetail, 'funnel_daten' | 'ki_session_id' | 'ki_zusammenfassung' | 'kanal'>
): boolean {
  if (lead.ki_zusammenfassung?.trim()) return true
  if (lead.ki_session_id?.trim()) return true
  if (isGptProjektStudio(lead.funnel_daten)) return true

  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : null
  if (!fd) return false

  if (String(fd.gpt_session_id ?? '').trim()) return true
  if (Array.isArray(fd.ki_chat_verlauf) && fd.ki_chat_verlauf.length > 0) return true
  if (fd.vertriebs_kontext && typeof fd.vertriebs_kontext === 'object') return true
  if (fd.projekt_studio === true) return true
  const quelle = String(fd.funnel_quelle ?? '').toLowerCase()
  if (quelle.startsWith('gpt_') || quelle.includes('ki')) return true

  return false
}

function AnalyseAbschnitt({ text }: { text: string }) {
  const blocks = text.split(/\n(?=\*\*)/).filter(Boolean)
  return (
    <div className="space-y-3 text-[length:var(--fs-text)] leading-relaxed text-bw-text">
      {blocks.map((block, i) => {
        const m = block.match(/^\*\*(.+?)\*\*\n?([\s\S]*)$/)
        if (m) {
          const body = m[2].trim()
          const lines = body.split('\n').filter(Boolean)
          const isList = lines.every((l) => l.startsWith('- '))
          return (
            <div key={i}>
              <p className="mb-1 text-[length:var(--fs-meta)] font-semibold text-bw-text">{m[1]}</p>
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
      <p className="mb-1.5 text-[length:var(--fs-meta)] font-semibold text-bw-text">{title}</p>
      <div className="text-[length:var(--fs-text)] leading-relaxed text-bw-text-muted">{children}</div>
    </div>
  )
}

/** KI-Auskunft inline in Bedarf (kein eigene Card). */
export function LeadGptStudioBlock({ lead }: { lead: LeadDetail }) {
  const studio = useMemo(() => parseGptProjektStudioFunnel(lead.funnel_daten), [lead.funnel_daten])
  const istGpt = Boolean(studio)

  const [analyse, setAnalyse] = useState(lead.ki_zusammenfassung?.trim() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

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
    <>
      <div className="ki-bedarf-inline space-y-3 rounded-xl border border-[#2E7D52]/30 bg-[#EAF3DE]/55 p-3.5 md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[#2E7D52]">
              Lead-Auskunft · KI
            </p>
            {istGpt ? (
              <p className="mt-1 text-[length:var(--fs-text)] leading-relaxed text-bw-text-muted">
                Quelle: <span className="font-medium text-bw-text">{quelleLabel}</span> — Chat,
                Eingaben und Visualisierung für den Vertrieb.
              </p>
            ) : (
              <p className="mt-1 text-[length:var(--fs-text)] leading-relaxed text-bw-text-muted">
                Anfrage über den <span className="font-medium text-bw-text">KI-Rechner</span> —
                Eingaben und Chat fließen in die Analyse ein.
              </p>
            )}
          </div>
          <MockBtn
            sm
            kind="ghost"
            disabled={loading}
            onClick={() => void analyseAktualisieren()}
            title="Analyse neu berechnen"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Aktualisieren</span>
              </>
            )}
          </MockBtn>
        </div>

        {loading && !analyse ? (
          <div className="flex items-center gap-2 text-[length:var(--fs-text)] text-bw-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chat und Website-Verhalten werden ausgewertet…
          </div>
        ) : analyse ? (
          <AnalyseAbschnitt text={analyse} />
        ) : (
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            {error ?? 'Noch keine Analyse — bitte „Aktualisieren“ tippen.'}
          </p>
        )}

        {error && analyse ? <p className="text-[length:var(--fs-meta)] text-status-cancel-text">{error}</p> : null}

        {!analyse && erk && !loading ? (
          <div className="space-y-3 rounded-lg border border-[#2E7D52]/15 bg-white/60 p-3">
            <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
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
            <p className="mb-2 text-[length:var(--fs-meta)] font-semibold text-bw-text">Kundenfotos (Website)</p>
            <div className="flex flex-wrap gap-2">
              {galerie.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block h-16 w-16 overflow-hidden rounded-lg border border-[#2E7D52]/20"
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
          <button
            type="button"
            className="inline-flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg border border-[#2E7D52]/25 bg-white/70 px-3 py-2 text-left text-[length:var(--fs-text)] font-semibold text-[#1A3D2B] transition hover:bg-white"
            onClick={() => setChatOpen(true)}
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-[#2E7D52]" aria-hidden />
              Chat-Verlauf ({chat.length})
            </span>
            <span className="text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Öffnen</span>
          </button>
        ) : null}
      </div>

      <MockModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        icon="message"
        title="Chat-Verlauf"
        sub={`${chat.length} Nachrichten · Website-KI`}
        size="lg"
      >
        <div className="max-h-[min(70vh,520px)] space-y-2.5 overflow-y-auto overscroll-contain pr-1">
          {chat.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn(
                'rounded-lg px-3 py-2.5 text-[length:var(--fs-text)] leading-relaxed',
                m.role === 'user' ? 'bg-bw-bg text-bw-text' : 'bg-[#EAF3DE] text-[#1A3D2B]'
              )}
            >
              <p className="mb-0.5 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide opacity-70">
                {m.role === 'user' ? 'Kunde' : 'KI'}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
      </MockModal>
    </>
  )
}
