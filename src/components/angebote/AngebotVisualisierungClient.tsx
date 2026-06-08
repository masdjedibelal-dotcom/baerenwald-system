'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { ImageIcon, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import { VizZielbildCard } from '@/components/angebote/VizZielbildCard'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import {
  VIZ_IST_FIX_TAGS,
  VIZ_MAX_IST_BILDER,
  VIZ_NACHPROMPT_TAGS,
  VIZ_STIL_TAGS,
} from '@/lib/visualize/constants'
import type { KiVizPromptHistoryEntry, KiVisualisierung } from '@/lib/visualize/types'
import type { AngebotDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

type Modus = 'prompt' | 'zielbild'

function versionenAusSession(session: KiVisualisierung | null): KiVizPromptHistoryEntry[] {
  return session?.prompt_history ?? []
}

function VizImageDropzone({
  inputId,
  disabled,
  uploading,
  isDragging,
  onDragState,
  onFile,
  className,
  children,
}: {
  inputId: string
  disabled?: boolean
  uploading?: boolean
  isDragging?: boolean
  onDragState: (dragging: boolean) => void
  onFile: (file: File) => void
  className?: string
  children: ReactNode
}) {
  const blocked = disabled || uploading

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!blocked) onDragState(true)
  }

  function handleDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    const rel = e.relatedTarget as Node | null
    if (!rel || !e.currentTarget.contains(rel)) onDragState(false)
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    onDragState(false)
    if (blocked) return
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-bw-border p-4 text-center transition-colors',
        isDragging && 'border-bw-primary bg-bw-hover/40',
        blocked && 'pointer-events-none opacity-60',
        className
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        disabled={blocked}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}

export function AngebotVisualisierungClient({
  detail,
  initialSession,
}: {
  detail: AngebotDetail
  initialSession?: KiVisualisierung | null
}) {
  const [session, setSession] = useState<KiVisualisierung | null>(initialSession ?? null)
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id ?? null)
  const [aktivesIstIndex, setAktivesIstIndex] = useState(0)
  const [prompt, setPrompt] = useState(initialSession?.analysierter_prompt ?? '')
  const [istHinweis, setIstHinweis] = useState('')
  const [modus, setModus] = useState<Modus>('prompt')
  const [isRendering, setIsRendering] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aktiveVersion, setAktiveVersion] = useState(0)
  const [nachprompt, setNachprompt] = useState('')
  const [insAngebotOpen, setInsAngebotOpen] = useState(false)
  const [insAngebotPdf, setInsAngebotPdf] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(!initialSession)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [istDragging, setIstDragging] = useState(false)
  const istInputId = `viz-ist-upload-${detail.id}`
  const zielInputId = `viz-ziel-upload-${detail.id}`

  const istBilderUrls = session?.ist_bilder_urls ?? []
  const zielBildUrl = session?.ziel_bild_url ?? null
  const versionen = useMemo(() => versionenAusSession(session), [session])
  const aktiveErgebnis = versionen[aktiveVersion] ?? null
  const leadFotos = useMemo(() => parseProjektFotos(detail.fotos_urls), [detail.fotos_urls])

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId
    setSessionLoading(true)
    try {
      const res = await fetch('/api/visualize/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angebot_id: detail.id }),
      })
      let data: { session?: KiVisualisierung; error?: string }
      try {
        data = (await res.json()) as typeof data
      } catch {
        const msg = 'Session fehlgeschlagen — Server-Antwort ungültig'
        setSessionError(msg)
        toast.error(msg)
        return null
      }
      if (!res.ok || !data.session) {
        const msg = data.error ?? 'Session fehlgeschlagen'
        setSessionError(msg)
        toast.error(msg)
        return null
      }
      setSessionError(null)
      setSession(data.session)
      setSessionId(data.session.id)
      return data.session.id
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Session fehlgeschlagen'
      setSessionError(msg)
      toast.error(msg)
      return null
    } finally {
      setSessionLoading(false)
    }
  }, [detail.id, sessionId])

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession)
      setSessionId(initialSession.id)
      const hist = initialSession.prompt_history ?? []
      if (hist.length) {
        setAktiveVersion(hist.length - 1)
        setPrompt(hist[hist.length - 1]?.prompt ?? '')
      } else if (initialSession.analysierter_prompt) {
        setPrompt(initialSession.analysierter_prompt)
      }
      return
    }
    void ensureSession()
  }, [ensureSession, initialSession])

  useEffect(() => {
    if (versionen.length && aktiveVersion >= versionen.length) {
      setAktiveVersion(versionen.length - 1)
    }
  }, [versionen.length, aktiveVersion])

  async function uploadFile(file: File, kind: 'ist' | 'ziel') {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error('Bitte ein Bild (JPEG, PNG oder WebP) wählen')
      return
    }

    setUploading(true)
    try {
      const sid = await ensureSession()
      if (!sid) return

      const fd = new FormData()
      fd.set('angebot_id', detail.id)
      fd.set('session_id', sid)
      fd.set('kind', kind)
      fd.set('file', file)

      const res = await fetch('/api/visualize/upload', { method: 'POST', body: fd })
      let data: { session?: KiVisualisierung; error?: string }
      try {
        data = (await res.json()) as typeof data
      } catch {
        throw new Error('Upload fehlgeschlagen — Server-Antwort ungültig')
      }
      if (!res.ok || !data.session) throw new Error(data.error ?? 'Upload fehlgeschlagen')
      setSession(data.session)
      toast.success(kind === 'ziel' ? 'Ziel-Bild hochgeladen' : 'Ist-Bild hochgeladen')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  async function removeIstBild(url: string) {
    if (!sessionId) return
    const next = istBilderUrls.filter((u) => u !== url)
    const res = await fetch('/api/visualize/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        angebot_id: detail.id,
        session_id: sessionId,
        ist_bilder_urls: next,
      }),
    })
    const data = (await res.json()) as { session?: KiVisualisierung; error?: string }
    if (!res.ok || !data.session) {
      toast.error(data.error ?? 'Entfernen fehlgeschlagen')
      return
    }
    setSession(data.session)
    setAktivesIstIndex(0)
  }

  function uebernehmeLeadFotos() {
    const urls = leadFotos.map((f) => f.url).slice(0, VIZ_MAX_IST_BILDER)
    if (!urls.length) {
      toast.error('Keine Projekt-Fotos im Angebot')
      return
    }
    void (async () => {
      const sid = await ensureSession()
      if (!sid) return
      const res = await fetch('/api/visualize/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebot_id: detail.id,
          session_id: sid,
          ist_bilder_urls: urls,
        }),
      })
      const data = (await res.json()) as { session?: KiVisualisierung; error?: string }
      if (!res.ok || !data.session) {
        toast.error(data.error ?? 'Übernehmen fehlgeschlagen')
        return
      }
      setSession(data.session)
      toast.success('Fotos aus Angebot übernommen')
    })()
  }

  async function analyzeZielBild() {
    const sid = await ensureSession()
    if (!sid) return
    const istUrl = istBilderUrls[aktivesIstIndex]?.trim()
    const zielUrl = zielBildUrl?.trim()
    if (!istUrl || !zielUrl) {
      toast.error('Ist- und Ziel-Bild erforderlich')
      return
    }

    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/visualize/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          angebot_id: detail.id,
          session_id: sid,
          ist_bild_url: istUrl,
          ziel_bild_url: zielUrl,
          ist_hinweis: istHinweis.trim() || undefined,
        }),
      })
      let data: { prompt?: string; error?: string }
      try {
        data = (await res.json()) as typeof data
      } catch {
        throw new Error(`Analyse fehlgeschlagen (HTTP ${res.status})`)
      }
      if (!res.ok || !data.prompt) {
        throw new Error(data.error ?? `Analyse fehlgeschlagen (HTTP ${res.status})`)
      }
      setPrompt(data.prompt)
      toast.success('Prompt erstellt — bitte prüfen')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analyse fehlgeschlagen')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function renderPrompt(overridePrompt?: string) {
    const sid = await ensureSession()
    if (!sid) return
    const p = (overridePrompt ?? prompt).trim()
    const istUrl = istBilderUrls[aktivesIstIndex]?.trim()
    if (!istUrl || !p) {
      toast.error('Ist-Bild und Prompt erforderlich')
      return
    }

    setIsRendering(true)
    try {
      const res = await fetch('/api/visualize/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebot_id: detail.id,
          session_id: sid,
          ist_bild_url: istUrl,
          prompt: p,
          ist_hinweis: istHinweis.trim() || undefined,
        }),
      })
      const data = (await res.json()) as {
        session?: KiVisualisierung
        version?: number
        error?: string
      }
      if (!res.ok || !data.session) throw new Error(data.error ?? 'Render fehlgeschlagen')
      setSession(data.session)
      const idx = (data.session.prompt_history?.length ?? 1) - 1
      setAktiveVersion(idx)
      setPrompt(p)
      toast.success(`Version V${data.version ?? idx + 1} fertig`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Render fehlgeschlagen')
    } finally {
      setIsRendering(false)
    }
  }

  function appendIstFixTag(tag: string) {
    setIstHinweis((prev) => {
      const t = prev.trim()
      if (!t) return tag
      if (t.toLowerCase().includes(tag.toLowerCase())) return t
      return `${t}, ${tag}`
    })
  }

  function appendStilTag(tag: string) {
    setPrompt((prev) => {
      const t = prev.trim()
      if (!t) return `${tag} interior design, photorealistic`
      if (t.toLowerCase().includes(tag.toLowerCase())) return t
      return `${t}, ${tag.toLowerCase()} style`
    })
  }

  function nachpromptRender(delta: string) {
    const base = aktiveErgebnis?.prompt?.trim() || prompt.trim()
    const next = `${base}, ${delta}`
    setPrompt(next)
    void renderPrompt(next)
  }

  async function insAngebotUebernehmen() {
    if (!sessionId || !aktiveErgebnis?.ergebnis_url) return
    const urls = [aktiveErgebnis.ergebnis_url]
    const res = await fetch('/api/visualize/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        angebot_id: detail.id,
        session_id: sessionId,
        ausgewaehlte_urls: urls,
        ins_angebot: insAngebotPdf,
      }),
    })
    const data = (await res.json()) as { success?: boolean; session?: KiVisualisierung; error?: string }
    if (!res.ok || !data.success) {
      toast.error(data.error ?? 'Speichern fehlgeschlagen')
      return
    }
    if (data.session) setSession(data.session)
    setInsAngebotOpen(false)
    toast.success('Visualisierung ins Angebot übernommen')
  }

  const kannRendern = istBilderUrls.length > 0 && prompt.trim().length > 0 && !isRendering
  const istUrlAktiv = istBilderUrls[aktivesIstIndex]?.trim()
  const zielbildBeschreibung = prompt.trim() || session?.analysierter_prompt?.trim() || ''

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-primary">KI-Visualisierung</p>
          <h1 className="text-xl font-semibold text-bw-text">Visualisierung erstellen</h1>
          <p className="text-sm text-bw-text-muted">
            {detail.angebotsnr ?? 'Angebot'} · {detail.kunden?.name ?? 'Kunde'}
          </p>
        </div>
        <Link href={`/angebote/${detail.id}`} className="text-sm text-bw-link hover:underline">
          ← Zurück zum Angebot
        </Link>
      </div>

      {sessionError ? (
        <div className="rounded-lg border border-status-cancel-bg bg-red-50 px-4 py-3 text-sm text-status-cancel-text">
          <p className="font-medium">Visualisierung nicht bereit</p>
          <p className="mt-1">{sessionError}</p>
          <p className="mt-2 text-xs opacity-90">
            Falls die Tabelle fehlt: Migration{' '}
            <code className="rounded bg-white/80 px-1">20260620120000_ki_visualisierungen.sql</code> in Supabase
            ausführen.
          </p>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => void ensureSession()}>
            Erneut versuchen
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linke Spalte */}
        <div className="space-y-5 rounded-xl border border-bw-border bg-white p-4 md:p-5">
          <section>
            <h2 className="text-sm font-semibold text-bw-text">Ist-Zustand (Pflicht)</h2>
            <p className="mb-2 text-xs text-bw-text-muted">Max. {VIZ_MAX_IST_BILDER} Fotos — pro Render wird das aktive Bild genutzt</p>

            <VizImageDropzone
              inputId={istInputId}
              uploading={uploading}
              disabled={sessionLoading && !sessionId}
              isDragging={istDragging}
              onDragState={setIstDragging}
              onFile={(f) => void uploadFile(f, 'ist')}
              className="min-h-[100px]"
            >
              {uploading ? (
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-bw-text-muted" aria-hidden />
              ) : (
                <ImageIcon className="mb-2 h-8 w-8 text-bw-text-muted" aria-hidden />
              )}
              <p className="text-sm text-bw-text-muted">
                {uploading
                  ? 'Wird hochgeladen…'
                  : istDragging
                    ? 'Bild hier ablegen'
                    : 'Drag & Drop oder klicken'}
              </p>
            </VizImageDropzone>

            {leadFotos.length > 0 ? (
              <Button type="button" variant="secondary" className="mt-2 w-full text-sm" onClick={uebernehmeLeadFotos}>
                Aus Angebot-Fotos übernehmen
              </Button>
            ) : null}

            {istBilderUrls.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {istBilderUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={cn(
                      'relative h-20 w-20 overflow-hidden rounded-lg border-2',
                      i === aktivesIstIndex ? 'border-bw-primary' : 'border-bw-border'
                    )}
                    onClick={() => setAktivesIstIndex(i)}
                    title={i === aktivesIstIndex ? 'Aktives Ist-Bild' : 'Als Ist-Bild wählen'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <span
                      role="button"
                      className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        void removeIstBild(url)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-bw-text">Ist-Geometrie schützen</h2>
            <p className="mb-2 text-xs text-bw-text-muted">
              Optional — nur Material/Farbe ändern, Raumform und Grenzen bleiben (z. B. Fliesen nur bis halbe Höhe).
            </p>
            <textarea
              className="input min-h-[72px] w-full text-sm"
              rows={2}
              value={istHinweis}
              onChange={(e) => setIstHinweis(e.target.value)}
              placeholder="z. B. Fliesen nur bis zur Hälfte, Fenster links unverändert, Badewanne bleibt"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VIZ_IST_FIX_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full border border-bw-border px-2.5 py-0.5 text-xs text-bw-text-muted hover:border-bw-primary hover:text-bw-primary"
                  onClick={() => appendIstFixTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-bw-text">Was soll entstehen?</h2>
            <div className="mt-2 flex gap-1 rounded-lg bg-bw-bg p-1">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium',
                  modus === 'prompt' ? 'bg-white text-bw-primary shadow-sm' : 'text-bw-text-muted'
                )}
                onClick={() => setModus('prompt')}
              >
                ✏️ Eigener Prompt
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium',
                  modus === 'zielbild' ? 'bg-white text-bw-primary shadow-sm' : 'text-bw-text-muted'
                )}
                onClick={() => setModus('zielbild')}
              >
                📷 Ziel-Bild
              </button>
            </div>

            {modus === 'prompt' ? (
              <>
                <textarea
                  className="input mt-3 min-h-[120px] w-full text-sm"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Beschreibe wie es aussehen soll… z.B. modernes Bad, weiße Marmorfliesen, freistehende Badewanne, warmes Licht"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VIZ_STIL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="rounded-full border border-bw-border px-2.5 py-0.5 text-xs text-bw-text-muted hover:border-bw-primary hover:text-bw-primary"
                      onClick={() => appendStilTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                <VizImageDropzone
                  inputId={zielInputId}
                  uploading={uploading}
                  disabled={sessionLoading && !sessionId}
                  onDragState={() => {}}
                  onFile={(f) => void uploadFile(f, 'ziel')}
                  className="min-h-[80px] flex-row gap-2 p-3 text-sm text-bw-text-muted"
                >
                  {zielBildUrl ? 'Ziel-Bild ersetzen' : 'Ziel-Bild hochladen'}
                </VizImageDropzone>
                {zielBildUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={zielBildUrl} alt="Ziel" className="max-h-40 rounded-lg border border-bw-border object-cover" />
                ) : null}
                <p className="text-xs text-bw-text-muted">
                  Claude vergleicht Ist + Ziel und überträgt nur Stil (Material, Farbe, Muster) — nicht das Raumlayout
                  vom Zielbild.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={isAnalyzing || !zielBildUrl || !istBilderUrls.length}
                  onClick={() => void analyzeZielBild()}
                >
                  {isAnalyzing ? 'Analysiert…' : 'Stil analysieren'}
                </Button>
                <label className="block text-xs font-medium text-bw-text">Render-Prompt (vor Rendern anpassen)</label>
                <textarea
                  className="input min-h-[100px] w-full text-sm"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Nach Analyse: Prompt prüfen und ergänzen, z. B. welche Flächen welches Material bekommen…"
                />
                <p className="text-xs text-bw-text-muted">
                  Nach dem ersten Render rechts „Anpassen“ nutzen — Prompt ändern und neu rendern.
                </p>
              </div>
            )}
          </section>

          <Button
            type="button"
            variant="primary"
            className="w-full bg-[#1A3D2B] hover:bg-[#153222]"
            disabled={!kannRendern}
            onClick={() => void renderPrompt()}
          >
            {isRendering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                KI rendert… (~8–60 Sek.)
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Rendern →
              </>
            )}
          </Button>
          {isRendering ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-bw-border">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-bw-primary" />
            </div>
          ) : null}
        </div>

        {/* Rechte Spalte */}
        <div className="space-y-4 rounded-xl border border-bw-border bg-white p-4 md:p-5">
          {!aktiveErgebnis ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg bg-bw-bg text-center">
              <div className="mb-3 text-2xl font-bold text-[#2E7D52]">Bärenwald</div>
              <p className="text-sm text-bw-text-muted">Ergebnis erscheint hier</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[1fr_min(300px,38%)]">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <figure className="m-0">
                      <figcaption className="mb-1 text-xs font-medium text-bw-text-muted">Vorher</figcaption>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={istUrlAktiv}
                        alt="Vorher"
                        className="aspect-[4/3] w-full rounded-lg border border-bw-border object-cover"
                      />
                    </figure>
                    <figure className="m-0">
                      <figcaption className="mb-1 text-xs font-medium text-[#2E7D52]">Nachher</figcaption>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={aktiveErgebnis.ergebnis_url}
                        alt={`Visualisierung V${aktiveErgebnis.version}`}
                        className="aspect-[4/3] w-full animate-in fade-in rounded-lg border border-bw-border object-cover duration-500"
                      />
                    </figure>
                  </div>
                  {versionen.length > 1 ? (
                    <div className="flex flex-wrap gap-1">
                      {versionen.map((v, i) => (
                        <button
                          key={v.version}
                          type="button"
                          className={cn(
                            'rounded-md px-2.5 py-1 text-xs font-medium',
                            i === aktiveVersion
                              ? 'bg-bw-primary text-white'
                              : 'bg-bw-bg text-bw-text-muted hover:text-bw-text'
                          )}
                          onClick={() => setAktiveVersion(i)}
                        >
                          V{v.version}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {istUrlAktiv && aktiveErgebnis.ergebnis_url ? (
                  <VizZielbildCard
                    vorherUrl={istUrlAktiv}
                    nachherUrl={aktiveErgebnis.ergebnis_url}
                    beschreibung={zielbildBeschreibung}
                  />
                ) : null}
              </div>

              <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
                <p className="mb-1 text-xs font-semibold text-bw-text">Anpassen & neu rendern</p>
                <p className="mb-2 text-xs text-bw-text-muted">
                  Prompt ergänzen — Ist-Geometrie bleibt durch die Schutz-Regeln erhalten.
                </p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {VIZ_NACHPROMPT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="rounded-full border border-bw-border bg-white px-2.5 py-0.5 text-xs hover:border-bw-primary"
                      disabled={isRendering}
                      onClick={() => nachpromptRender(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 py-1.5 text-sm"
                    value={nachprompt}
                    onChange={(e) => setNachprompt(e.target.value)}
                    placeholder="Eigener Zusatz…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nachprompt.trim()) {
                        nachpromptRender(nachprompt.trim())
                        setNachprompt('')
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!nachprompt.trim() || isRendering}
                    onClick={() => {
                      nachpromptRender(nachprompt.trim())
                      setNachprompt('')
                    }}
                  >
                    →
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 bg-[#1A3D2B]"
                  onClick={() => setInsAngebotOpen(true)}
                >
                  ✓ Ins Angebot übernehmen
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setAktiveVersion(versionen.length)
                    setPrompt('')
                  }}
                >
                  + Neue Variante
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={insAngebotOpen}
        onClose={() => setInsAngebotOpen(false)}
        title="Ins Angebot übernehmen"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setInsAngebotOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" onClick={() => void insAngebotUebernehmen()}>
              Übernehmen
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-bw-text-muted">Aktuell</p>
            {istBilderUrls[aktivesIstIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={istBilderUrls[aktivesIstIndex]} alt="Vorher" className="rounded-lg border border-bw-border" />
            ) : null}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[#2E7D52]">Visualisierung</p>
            {aktiveErgebnis ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aktiveErgebnis.ergebnis_url} alt="Nachher" className="rounded-lg border border-bw-border" />
            ) : null}
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={insAngebotPdf}
            onChange={(e) => setInsAngebotPdf(e.target.checked)}
          />
          Auf Visualisierungs-Seite im PDF einfügen
        </label>
      </Modal>
    </div>
  )
}
