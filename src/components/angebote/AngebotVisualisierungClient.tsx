'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn, MockTextarea } from '@/components/mock-ui'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
<<<<<<< Updated upstream
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
=======
import { MockBtn } from '@/components/mock-ui'
import { Modal } from '@/components/ui/Modal'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import { VizPrepareQuestions } from '@/components/angebote/VizPrepareQuestions'
import { VizZielbildCard } from '@/components/angebote/VizZielbildCard'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import {
  VIZ_MAX_IST_BILDER,
  VIZ_NACHPROMPT_TAGS,
  VIZ_STIL_TAGS,
} from '@/lib/visualize/constants'
import type {
  KiVizPromptHistoryEntry,
  KiVisualisierung,
  VizBauErklaerung,
  VizPrepareQuestion,
  VizRaumAnalyse,
} from '@/lib/visualize/types'
import type { AngebotDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

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
        'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-bw-border p-4 text-center transition-colors',
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
  initialIstUrl,
}: {
  detail: AngebotDetail
  initialSession?: KiVisualisierung | null
  /** Aus Wizard: Foto-URL als Ist-Bild übernehmen */
  initialIstUrl?: string | null
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<KiVisualisierung | null>(initialSession ?? null)
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id ?? null)
  const [aktivesIstIndex, setAktivesIstIndex] = useState(0)
  const [prompt, setPrompt] = useState(
    initialSession?.wunsch_text ?? initialSession?.analysierter_prompt ?? ''
  )
  const [raumAnalyse, setRaumAnalyse] = useState<VizRaumAnalyse | null>(
    initialSession?.raum_analyse ?? null
  )
  const [erklaerungByVersion, setErklaerungByVersion] = useState<Record<number, VizBauErklaerung>>(
    () => {
      if (initialSession?.gpt_erklaerung && initialSession.prompt_history.length) {
        const v = initialSession.prompt_history[initialSession.prompt_history.length - 1]?.version
        if (v) return { [v]: initialSession.gpt_erklaerung }
      }
      return {}
    }
  )
  const [modus, setModus] = useState<Modus>('prompt')
  const [isRendering, setIsRendering] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<VizPrepareQuestion | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aktiveVersion, setAktiveVersion] = useState(0)
  const [insAngebotOpen, setInsAngebotOpen] = useState(false)
  const [insAngebotPdf, setInsAngebotPdf] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(!initialSession)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [istDragging, setIstDragging] = useState(false)
  const istInputId = `viz-ist-upload-${detail.id}`
  const zielInputId = `viz-ziel-upload-${detail.id}`
  const initialIstAppliedRef = useRef(false)

  const istBilderUrls = session?.ist_bilder_urls ?? []
  const zielBildUrl = session?.ziel_bild_url ?? null
  const versionen = useMemo(() => versionenAusSession(session), [session])
  const aktiveErgebnis = versionen[aktiveVersion] ?? null
  const aktiveErklaerung = erklaerungByVersion[aktiveErgebnis?.version ?? 0] ?? null
  const leadFotos = useMemo(() => parseProjektFotos(detail.fotos_urls), [detail.fotos_urls])

  const analyzeRoom = useCallback(
    async (istUrl: string, sid?: string) => {
      try {
        const res = await fetch('/api/visualize/analyze-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angebot_id: detail.id,
            session_id: sid,
            ist_bild_url: istUrl,
          }),
        })
        const data = (await res.json()) as { raum_analyse?: VizRaumAnalyse; error?: string }
        if (!res.ok || !data.raum_analyse) return
        setRaumAnalyse(data.raum_analyse)
        setPrompt((prev) => prev.trim() || data.raum_analyse?.wunsch_entwurf || '')
      } catch {
        /* optional */
      }
    },
    [detail.id]
  )

  const analyzeInspiration = useCallback(
    async (zielUrl: string, sid: string) => {
      try {
        await fetch('/api/visualize/analyze-inspiration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angebot_id: detail.id,
            session_id: sid,
            ziel_bild_url: zielUrl,
          }),
        })
      } catch {
        /* optional */
      }
    },
    [detail.id]
  )

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
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession)
      setSessionId(initialSession.id)
      const hist = initialSession.prompt_history ?? []
      if (hist.length) {
        setAktiveVersion(hist.length - 1)
        setPrompt(hist[hist.length - 1]?.prompt ?? '')
      } else if (initialSession.wunsch_text || initialSession.analysierter_prompt) {
        setPrompt(initialSession.wunsch_text ?? initialSession.analysierter_prompt ?? '')
      }
      if (initialSession.raum_analyse) setRaumAnalyse(initialSession.raum_analyse)
      return
    }
    void ensureSession()
  }, [ensureSession, initialSession])

  useEffect(() => {
    if (versionen.length && aktiveVersion >= versionen.length) {
      setAktiveVersion(versionen.length - 1)
    }
  }, [versionen.length, aktiveVersion])

  useEffect(() => {
    const istUrl = initialIstUrl?.trim()
    if (!istUrl || initialIstAppliedRef.current || initialSession) return

    initialIstAppliedRef.current = true

    void (async () => {
      const sid = await ensureSession()
      if (!sid) return

      const loadRes = await fetch('/api/visualize/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angebot_id: detail.id, session_id: sid }),
      })
      const loadData = (await loadRes.json()) as { session?: KiVisualisierung }
      const existing = loadData.session?.ist_bilder_urls ?? []
      const already = existing.includes(istUrl)
      const nextUrls = already
        ? existing
        : [...existing, istUrl].slice(0, VIZ_MAX_IST_BILDER)

      if (!already) {
        const res = await fetch('/api/visualize/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angebot_id: detail.id,
            session_id: sid,
            ist_bilder_urls: nextUrls,
          }),
        })
        const data = (await res.json()) as { session?: KiVisualisierung; error?: string }
        if (!res.ok || !data.session) {
          toast.error(data.error ?? 'Ist-Bild konnte nicht übernommen werden')
          return
        }
        setSession(data.session)
      }

      const idx = nextUrls.indexOf(istUrl)
      setAktivesIstIndex(idx >= 0 ? idx : 0)
      void analyzeRoom(istUrl, sid)
      toast.success(TOAST.foto_aus_angebot_als_ist_bild_uebernommen)
    })()
  }, [initialIstUrl, initialSession, ensureSession, detail.id, analyzeRoom])

  async function uploadFile(file: File, kind: 'ist' | 'ziel') {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      applyFieldErrors({ _form: TOAST.bitte_ein_bild_jpeg_png_oder_webp_waehlen })
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
      if (kind === 'ist') {
        const urls = data.session.ist_bilder_urls ?? []
        const latest = urls[urls.length - 1]
        if (latest) void analyzeRoom(latest, sid)
      }
      if (kind === 'ziel' && data.session.ziel_bild_url) {
        void analyzeInspiration(data.session.ziel_bild_url, sid)
      }
    } catch (e) {
      toast.systemError(e, 'ui', 'Upload fehlgeschlagen')
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
      toast.error(data.error ?? 'Löschen fehlgeschlagen')
      return
    }
    setSession(data.session)
    setAktivesIstIndex(0)
  }

  function uebernehmeLeadFotos() {
    const urls = leadFotos.map((f) => f.url).slice(0, VIZ_MAX_IST_BILDER)
    if (!urls.length) {
      toast.error(TOAST.keine_projekt_fotos_im_angebot)
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
        toast.error(data.error ?? 'Speichern fehlgeschlagen')
        return
      }
      setSession(data.session)
      toast.success(TOAST.fotos_aus_angebot_uebernommen)
    })()
  }

  async function analyzeZielBild() {
    const sid = await ensureSession()
    if (!sid) return
    const istUrl = istBilderUrls[aktivesIstIndex]?.trim()
    const zielUrl = zielBildUrl?.trim()
    if (!istUrl || !zielUrl) {
      toast.error(TOAST.ist_und_ziel_bild_erforderlich)
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
      toast.success(TOAST.wunschtext_erstellt_bitte_pruefen)
    } catch (e) {
      toast.systemError(e, 'ui', 'Analyse fehlgeschlagen')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function executeRender(wunsch: string, nachprompt?: string) {
    const sid = await ensureSession()
    if (!sid) return
    const istUrl = istBilderUrls[aktivesIstIndex]?.trim()
    if (!istUrl || !wunsch) {
      toast.error(TOAST.ist_bild_und_prompt_erforderlich)
      return
    }

    setIsRendering(true)
    setPendingQuestion(null)
    try {
      const res = await fetch('/api/visualize/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebot_id: detail.id,
          session_id: sid,
          ist_bild_url: istUrl,
          wunsch_text: wunsch,
          nachprompt,
        }),
      })
      const data = (await res.json()) as {
        session?: KiVisualisierung
        version?: number
        erklaerung?: VizBauErklaerung
        error?: string
      }
      if (!res.ok || !data.session) throw new Error(data.error ?? 'Render fehlgeschlagen')
      setSession(data.session)
      const idx = (data.session.prompt_history?.length ?? 1) - 1
      const version = data.version ?? idx + 1
      setAktiveVersion(idx)
      setPrompt(wunsch)
      if (data.erklaerung) {
        setErklaerungByVersion((prev) => ({ ...prev, [version]: data.erklaerung! }))
      }
      toast.success(`Version V${data.version ?? idx + 1} fertig`)
    } catch (e) {
      toast.systemError(e, 'ui', 'Render fehlgeschlagen')
    } finally {
      setIsRendering(false)
    }
  }

  async function prepareAndMaybeRender(
    wunsch: string,
    answer?: { question_id: string; option_id: string; option_label: string }
  ) {
    const sid = await ensureSession()
    if (!sid) return
    const istUrl = istBilderUrls[aktivesIstIndex]?.trim()
    if (!istUrl || !wunsch) {
      toast.error(TOAST.ist_bild_und_prompt_erforderlich)
      return
    }

    setIsPreparing(true)
    try {
      const res = await fetch('/api/visualize/prepare-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angebot_id: detail.id,
          session_id: sid,
          wunsch_text: wunsch,
          ...(answer ? { answer } : {}),
        }),
      })
      const data = (await res.json()) as {
        ready?: boolean
        questions?: VizPrepareQuestion[]
        session?: KiVisualisierung
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Vorbereitung fehlgeschlagen')
      if (data.session) setSession(data.session)
      setPrompt(wunsch)

      if (!data.ready && data.questions?.length) {
        setPendingQuestion(data.questions[0])
        return
      }

      setPendingQuestion(null)
      await executeRender(wunsch)
    } catch (e) {
      toast.systemError(e, 'ui', 'Vorbereitung fehlgeschlagen')
    } finally {
      setIsPreparing(false)
    }
  }

  function requestRender(overridePrompt?: string) {
    const wunsch = (overridePrompt ?? prompt).trim()
    void prepareAndMaybeRender(wunsch)
  }

  function answerVizQuestion(questionId: string, optionId: string, optionLabel: string) {
    const wunsch = prompt.trim()
    void prepareAndMaybeRender(wunsch, {
      question_id: questionId,
      option_id: optionId,
      option_label: optionLabel,
    })
  }

  function renderWithNachprompt(tag: string) {
    const base = prompt.trim()
    if (!base) return
    void executeRender(base, tag)
  }

  function appendStilTag(tag: string) {
    setPrompt((prev) => {
      const t = prev.trim()
      if (!t) return `${tag}-Stil, modern und hochwertig`
      if (t.toLowerCase().includes(tag.toLowerCase())) return t
      return `${t}, ${tag}-Stil`
    })
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
    toast.success(TOAST.visualisierung_ins_angebot_uebernommen)
  }

  const kannRendern =
    istBilderUrls.length > 0 &&
    prompt.trim().length > 0 &&
    !isRendering &&
    !isPreparing &&
    !pendingQuestion
  const istUrlAktiv = istBilderUrls[aktivesIstIndex]?.trim()

  const angebotLabel = detail.angebotsnr ?? 'Angebot'
  const kundeName = detail.kunden?.name ?? 'Kunde'

  function closeWizard() {
    router.push(`/angebote/${detail.id}`)
  }

  const wizardHeader = (
    <>
      <WizardMobileToolbar
        onClose={closeWizard}
        totalSteps={1}
        currentStep={1}
        stepLabel="KI-Visualisierung"
        actions={<span className="sr-only">Aktionen im Formular</span>}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
        <MockBtn kind="ghost" sm type="button" onClick={closeWizard} aria-label="Schließen">
          <MockIcon n="x" ctx="default" className="h-4 w-4" />
        </MockBtn>
        <div className="h-6 w-px bg-bw-border" aria-hidden />
        <div className="title-block min-w-0 flex-1">
          <div className="ttl">KI-Visualisierung erstellen</div>
          <div className="sub">
            {angebotLabel} · {kundeName}
          </div>
        </div>
      </div>
    </>
  )

  if (!mounted) return null

  const wizard = (
    <AppFlowScreen className="wizard-flow" header={wizardHeader}>
      <div className="wizard-inner mx-auto max-w-3xl space-y-4 pb-8">
      {sessionError ? (
        <div className="rounded-card border border-status-cancel-bg bg-status-cancel-bg px-4 py-3 text-[length:var(--fs-text)] text-status-cancel-text">
          <p className="font-medium">Visualisierung nicht bereit</p>
          <p className="mt-1">{sessionError}</p>
          <p className="mt-2 text-[length:var(--fs-meta)] opacity-90">
            Falls die Tabelle fehlt: Migration{' '}
            <code className="rounded-card bg-white/80 px-1">20260620120000_ki_visualisierungen.sql</code> in Supabase
            ausführen.
          </p>
          <MockBtn type="button" kind="secondary" className="mt-3" onClick={() => void ensureSession()}>
            Erneut versuchen
          </MockBtn>
        </div>
      ) : null}

      <div className="space-y-5 rounded-button border border-bw-border bg-white p-4 md:p-5">
          <section>
            <h2 className="text-[length:var(--fs-text)] font-semibold text-bw-text">Ist-Zustand (Pflicht)</h2>
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">Max. {VIZ_MAX_IST_BILDER} Fotos — pro Render wird das aktive Bild genutzt</p>

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
                <CrmInlineLoading label="Wird hochgeladen…" minHeight={80} />
              ) : (
                <>
                  <MockIcon n="photo" ctx="default" className="mb-2 h-8 w-8 text-bw-text-muted" aria-hidden />
                  <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                    {istDragging ? 'Bild hier ablegen' : 'Drag & Drop oder klicken'}
                  </p>
                </>
              )}
            </VizImageDropzone>

            {leadFotos.length > 0 ? (
              <MockBtn type="button" kind="secondary" className="mt-2 w-full text-[length:var(--fs-text)]" onClick={uebernehmeLeadFotos}>
                Aus Angebot-Fotos übernehmen
              </MockBtn>
            ) : null}

            {istBilderUrls.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {istBilderUrls.map((url, i) => (
                  <MockBtn className={cn(
                      'relative h-20 w-20 overflow-hidden rounded-card border-2',
                      i === aktivesIstIndex ? 'border-bw-primary' : 'border-bw-border'
                    )} key={url} type="button" onClick={() => setAktivesIstIndex(i)} title={i === aktivesIstIndex ? 'Aktives Ist-Bild' : 'Als Ist-Bild wählen'}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <span
                      role="button"
                      className="absolute right-0.5 top-0.5 rounded-button bg-black/60 p-0.5 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        void removeIstBild(url)
                      }}
                    >
                      <MockIcon n="x" ctx="default" className="h-3 w-3" />
                    </span>
                  </MockBtn>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-[length:var(--fs-text)] font-semibold text-bw-text">Was soll entstehen?</h2>
            <div className="mt-2 flex gap-1 rounded-button bg-bw-bg p-1">
              <MockBtn className={cn(
                  'flex-1 rounded-button px-3 py-1.5 text-[length:var(--fs-text)] font-medium',
                  modus === 'prompt' ? 'bg-white text-bw-primary shadow-sm' : 'text-bw-text-muted'
                )} type="button" onClick={() => setModus('prompt')}>
                ✏️ Eigener Prompt
              </MockBtn>
              <MockBtn className={cn(
                  'flex-1 rounded-button px-3 py-1.5 text-[length:var(--fs-text)] font-medium',
                  modus === 'zielbild' ? 'bg-white text-bw-primary shadow-sm' : 'text-bw-text-muted'
                )} type="button" onClick={() => setModus('zielbild')}>
                📷 Ziel-Bild
              </MockBtn>
            </div>

            {modus === 'prompt' ? (
              <p className="mt-2 text-[length:var(--fs-meta)] text-bw-text-muted">
                Beschreiben Sie auf Deutsch, wie der Raum aussehen soll.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <VizImageDropzone
                  inputId={zielInputId}
                  uploading={uploading}
                  disabled={sessionLoading && !sessionId}
                  onDragState={() => {}}
                  onFile={(f) => void uploadFile(f, 'ziel')}
                  className="min-h-[80px] flex-row gap-2 p-3 text-[length:var(--fs-text)] text-bw-text-muted"
                >
                  {zielBildUrl ? 'Ziel-Bild ersetzen' : 'Ziel-Bild hochladen'}
                </VizImageDropzone>
                {zielBildUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={zielBildUrl} alt="Ziel" className="max-h-40 rounded-card border border-bw-border object-cover" />
                ) : null}
                <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  Stil-Referenz — nur Material, Farbe und Atmosphäre werden übernommen, nicht das Raumlayout.
                </p>
                <MockBtn
                  type="button"
                  kind="secondary"
                  className="w-full"
                  disabled={isAnalyzing || !zielBildUrl || !istBilderUrls.length}
                  onClick={() => void analyzeZielBild()}
                >
                  {isAnalyzing ? 'Analysiert…' : 'Stil aus Ziel-Bild übernehmen'}
                </MockBtn>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[length:var(--fs-text)] font-semibold text-bw-text">Render-Prompt (Deutsch)</h2>
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              Wird serverseitig für die KI ins Englische übersetzt. Text anpassen und erneut auf Rendern klicken.
            </p>
            <MockTextarea className="min-h-[120px] w-full text-[length:var(--fs-text)]" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="z. B. modernes Bad, weiße Marmorfliesen, warmes Licht, Wände in hellem Grau…" />
            {modus === 'prompt' ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VIZ_STIL_TAGS.map((tag) => (
                  <MockBtn className="rounded-pill border border-bw-border px-2.5 py-0.5 text-[length:var(--fs-meta)] text-bw-text-muted hover:border-bw-primary hover:text-bw-primary" key={tag} type="button" onClick={() => appendStilTag(tag)}>
                    {tag}
                  </MockBtn>
                ))}
              </div>
            ) : null}
          </section>

          {pendingQuestion ? (
            <VizPrepareQuestions
              question={pendingQuestion}
              disabled={isPreparing || isRendering}
              onAnswer={answerVizQuestion}
            />
          ) : null}

          <MockBtn
            type="button"
            kind="primary"
<<<<<<< Updated upstream
            className="w-full bg-bw-dark hover:bg-bw-dark"
=======
            className="w-full bg-[#1A3D2B] hover:bg-[#153222]"
>>>>>>> Stashed changes
            disabled={!kannRendern}
            loading={isRendering || isPreparing}
            onClick={() => requestRender()}
          >
<<<<<<< Updated upstream
            {isPreparing
              ? 'Bereite Render vor…'
              : isRendering
                ? 'KI rendert… (~8–60 Sek.)'
                : (
                  <>
                    <MockIcon n="sparkles" ctx="default" className="mr-2 h-4 w-4" aria-hidden />
                    Rendern →
                  </>
                )}
=======
            {isRendering || isPreparing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {isPreparing ? 'Bereite Render vor…' : 'KI rendert… (~8–60 Sek.)'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Rendern →
              </>
            )}
>>>>>>> Stashed changes
          </MockBtn>
          {isRendering || isPreparing ? (
            <div className="h-1.5 overflow-hidden rounded-pill bg-bw-border">
              <div className="h-full w-1/3 animate-pulse rounded-pill bg-bw-primary" />
            </div>
          ) : null}

          {aktiveErgebnis && istUrlAktiv ? (
            <section className="space-y-3 border-t border-bw-border pt-5">
              {versionen.length > 1 ? (
                <div className="flex flex-wrap gap-1">
                  {versionen.map((v, i) => (
                    <MockBtn className={cn(
                        'rounded-button px-2.5 py-1 text-[length:var(--fs-meta)] font-medium',
                        i === aktiveVersion
                          ? 'bg-bw-primary text-white'
                          : 'bg-bw-bg text-bw-text-muted hover:text-bw-text'
                      )} key={v.version} type="button" onClick={() => {
                        setAktiveVersion(i)
                        setPrompt(v.prompt)
                      }}>
                      V{v.version}
                    </MockBtn>
                  ))}
                </div>
              ) : null}

              <VizZielbildCard
                vorherUrl={istUrlAktiv}
                nachherUrl={aktiveErgebnis.ergebnis_url}
                erklaerung={aktiveErklaerung}
              />

              <div>
                <p className="mb-2 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Feintuning (wie Website)</p>
                <div className="flex flex-wrap gap-1.5">
                  {VIZ_NACHPROMPT_TAGS.map((tag) => (
                    <MockBtn className="rounded-pill border border-bw-border px-2.5 py-0.5 text-[length:var(--fs-meta)] text-bw-text-muted hover:border-bw-primary hover:text-bw-primary disabled:opacity-50" key={tag} type="button" disabled={isRendering || isPreparing} onClick={() => renderWithNachprompt(tag)}>
                      {tag}
                    </MockBtn>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <MockBtn
                  type="button"
                  kind="primary"
<<<<<<< Updated upstream
                  className="flex-1 bg-bw-dark"
=======
                  className="flex-1 bg-[#1A3D2B]"
>>>>>>> Stashed changes
                  onClick={() => setInsAngebotOpen(true)}
                >
                  ✓ Ins Angebot übernehmen
                </MockBtn>
                <MockBtn
                  type="button"
                  kind="secondary"
                  className="flex-1"
                  onClick={() => {
                    setPrompt('')
                  }}
                >
                  + Neue Variante
                </MockBtn>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <EditorSheet
        open={insAngebotOpen}
        onClose={() => setInsAngebotOpen(false)}
<<<<<<< Updated upstream
        title="Ins Angebot speichern"
        secondary={{ label: 'Abbrechen', onClick: () => setInsAngebotOpen(false) }}
        primary={{
          label: 'Speichern',
          onClick: () => void insAngebotUebernehmen(),
        }}
=======
        title="Ins Angebot übernehmen"
        footer={
          <>
            <MockBtn type="button" kind="secondary" onClick={() => setInsAngebotOpen(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn type="button" kind="primary" onClick={() => void insAngebotUebernehmen()}>
              Übernehmen
            </MockBtn>
          </>
        }
>>>>>>> Stashed changes
      >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
                <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Aktuell</p>
            {istBilderUrls[aktivesIstIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={istBilderUrls[aktivesIstIndex]} alt="Vorher" className="rounded-card border border-bw-border" />
            ) : null}
          </div>
          <div>
            <p className="mb-1 text-[length:var(--fs-meta)] font-medium text-bw-primary">Visualisierung</p>
            {aktiveErgebnis ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aktiveErgebnis.ergebnis_url} alt="Nachher" className="rounded-card border border-bw-border" />
            ) : null}
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-[length:var(--fs-text)]">
          <MockCheckbox
            checked={insAngebotPdf}
            onChange={(e) => setInsAngebotPdf(e.target.checked)}
          />
          Auf Visualisierungs-Seite im PDF einfügen
        </label>
      </EditorSheet>
    </AppFlowScreen>
  )

  return createPortal(wizard, document.body)
}
