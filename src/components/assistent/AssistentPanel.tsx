'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { AssistentMarkdown } from '@/components/assistent/AssistentMarkdown'
import { KiChatComposer } from '@/components/assistent/KiChatComposer'
import { buildAssistentContextHint } from '@/lib/copilot/assistent-context'
import {
  getKiAssistScope,
  parseBwApplyDraft,
  stripBwApplyBlock,
  type KiAssistDraft,
} from '@/lib/copilot/ki-assist-scopes'
import { sanitizeAssistentChatText } from '@/lib/copilot/sanitize-chat-text'
import {
  emptyAssistentUi,
  type AssistentNavLink,
  type AssistentPreview,
  type AssistentUiPayload,
} from '@/lib/copilot/assistent-ui'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

type ChatMsg = {
  role: 'user' | 'assistant'
  content: string
  ui?: AssistentUiPayload
}

const QUICK_DEFAULT = [
  { label: 'Plan heute', prompt: 'Plane meinen Arbeitstag — Fokus und Reihenfolge.' },
  { label: 'Wichtige To-dos', prompt: 'Welche To-dos sind wichtig oder überfällig?' },
  { label: 'Offene Rechnungen', prompt: 'Zeige offene und überfällige Rechnungen mit Links.' },
  {
    label: 'Angebot aus Anfrage',
    prompt:
      'Welche neuen Anfragen brauchen ein Angebot? Schlage eine vor und starte den Angebots-Flow mit Vorschau/Link.',
  },
  {
    label: 'HW zuordnen',
    prompt:
      'Schlage für den aktuellen oder genannten Auftrag passende Handwerker je Gewerk vor — dann zuweisen nach meiner Bestätigung.',
  },
]

function AssistentUiBlocks({
  ui,
  onNavigate,
  onConfirm,
  disabled,
}: {
  ui: AssistentUiPayload
  onNavigate: (href: string) => void
  onConfirm: (prompt: string) => void
  disabled?: boolean
}) {
  if (!ui.links.length && !ui.previews.length) return null
  return (
    <div className="mt-2 space-y-2">
      {ui.previews.map((p, i) => (
        <PreviewCard
          key={`pv-${i}-${p.title}`}
          preview={p}
          disabled={disabled}
          onConfirm={() => onConfirm(p.confirmPrompt)}
        />
      ))}
      {ui.links.length ? (
        <div className="flex flex-wrap gap-1.5">
          {ui.links.map((l) => (
            <NavChip key={l.href + l.label} link={l} disabled={disabled} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NavChip({
  link,
  onNavigate,
  disabled,
}: {
  link: AssistentNavLink
  onNavigate: (href: string) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={link.hint}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#2E7D52]/35 bg-white px-2.5 py-1 text-[length:var(--fs-meta)] font-medium text-[#2E7D52] hover:bg-[#EAF3DE] disabled:opacity-50"
      onClick={() => onNavigate(link.href)}
    >
      <MockIcon ctx="btn" n="external-link" size={12} />
      <span className="truncate">{link.label}</span>
    </button>
  )
}

function PreviewCard({
  preview,
  onConfirm,
  disabled,
}: {
  preview: AssistentPreview
  onConfirm: () => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-lg border border-[#2E7D52]/30 bg-white p-2.5 shadow-sm">
      <p className="mb-1.5 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[#2E7D52]">
        {preview.title}
      </p>
      <dl className="space-y-1 text-[length:var(--fs-meta)]">
        {preview.rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-16 shrink-0 text-bw-text-muted">{r.label}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-bw-text">{r.value}</dd>
          </div>
        ))}
      </dl>
      {preview.warning ? (
        <p className="mt-1.5 text-[length:var(--fs-meta)] text-bw-text-muted">{preview.warning}</p>
      ) : null}
      <button
        type="button"
        className="btn primary sm mt-2 w-full"
        disabled={disabled}
        onClick={onConfirm}
      >
        Jetzt ausführen
      </button>
    </div>
  )
}

function PositionDraftCard({
  draft,
  onApply,
  disabled,
  applyLabel,
}: {
  draft: Extract<KiAssistDraft, { type: 'position' }>
  onApply: () => void
  disabled?: boolean
  applyLabel: string
}) {
  return (
    <div className="ki-pos-draft-card">
      <div className="ki-pos-draft-card__head">Positions-Vorschlag</div>
      <p className="ki-pos-draft-card__name">{draft.name || '—'}</p>
      {draft.beschreibung?.trim() ? (
        <p className="ki-pos-draft-card__desc">{draft.beschreibung}</p>
      ) : null}
      <p className="ki-pos-draft-card__meta">
        {[
          draft.menge != null && draft.menge > 0
            ? `${draft.menge} ${draft.einheit?.trim() || 'Stk.'}`
            : null,
          draft.preis != null && draft.preis >= 0
            ? `${formatEurBetrag(draft.preis)} netto`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Menge / Preis offen'}
      </p>
      <button
        type="button"
        className="btn primary sm ki-pos-draft-card__apply"
        disabled={disabled}
        onClick={onApply}
      >
        {applyLabel}
      </button>
    </div>
  )
}

function PositionenDraftCard({
  draft,
  onApply,
  disabled,
  applyLabel,
}: {
  draft: Extract<KiAssistDraft, { type: 'positionen' }>
  onApply: () => void
  disabled?: boolean
  applyLabel: string
}) {
  return (
    <div className="ki-pos-draft-card">
      <div className="ki-pos-draft-card__head">
        {draft.items.length} Positionen zum Übernehmen
      </div>
      <ul className="ki-pos-draft-card__list">
        {draft.items.map((it, i) => (
          <li key={`${it.name}-${i}`}>
            <span className="ki-pos-draft-card__name">{it.name}</span>
            <span className="ki-pos-draft-card__meta">
              {[
                it.menge != null && it.menge > 0
                  ? `${it.menge} ${it.einheit?.trim() || 'Stk.'}`
                  : null,
                it.preis != null && it.preis >= 0 ? formatEurBetrag(it.preis) : null,
                it.gewerk?.trim() || null,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn primary sm ki-pos-draft-card__apply"
        disabled={disabled}
        onClick={onApply}
      >
        {applyLabel}
      </button>
    </div>
  )
}

function TextDraftCard({
  draft,
  onApply,
  disabled,
  applyLabel,
}: {
  draft: Extract<KiAssistDraft, { type: 'text' | 'mail' | 'maengel' }>
  onApply: () => void
  disabled?: boolean
  applyLabel: string
}) {
  const head =
    draft.type === 'mail'
      ? 'Mail-Vorschlag'
      : draft.type === 'maengel'
        ? 'Mängel-Vorschlag'
        : 'Feldtext-Vorschlag'
  const titel =
    draft.type === 'mail'
      ? draft.betreff?.trim()
      : draft.type === 'text'
        ? draft.titel?.trim()
        : undefined
  const text = draft.text?.trim() || ''

  return (
    <div className="ki-pos-draft-card">
      <div className="ki-pos-draft-card__head">{head}</div>
      {titel ? <p className="ki-pos-draft-card__name">{titel}</p> : null}
      {text ? (
        <p className="ki-pos-draft-card__desc ki-pos-draft-card__desc--pre">{text}</p>
      ) : (
        <p className="ki-pos-draft-card__meta">Kein Text im Vorschlag</p>
      )}
      <button
        type="button"
        className="btn primary sm ki-pos-draft-card__apply"
        disabled={disabled || !text}
        onClick={onApply}
      >
        {applyLabel}
      </button>
    </div>
  )
}

export function AssistentPanel() {
  const router = useRouter()
  const {
    open,
    setOpen,
    pathname,
    scoped,
    clearScoped,
    autoSession,
    clearAutoSession,
    setPendingDraft,
  } = useAssistent()
  const scopeMeta = scoped ? getKiAssistScope(scoped.scopeId) : null

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSnapshot, setPageSnapshot] = useState<string | null>(null)
  const [stuckUp, setStuckUp] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastScopeKey = useRef<string | null>(null)
  const lastAutoId = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const contextHintRef = useRef('')

  const chatStarted =
    messages.some((m) => m.role === 'user') || pending || Boolean(autoSession)

  const startHeadline = autoSession
    ? autoSession.title
    : scopeMeta
      ? scopeMeta.label
      : 'Wie kann ich dir helfen?'
  const startSub = autoSession
    ? 'KPI-Analyse für den Geschäftsführer'
    : scopeMeta
      ? scoped?.layer === 'over-sheet'
        ? scoped.scopeId === 'feld'
          ? 'Sag, wie der Feldtext werden soll — danach Übernehmen.'
          : scoped.scopeId === 'positionen' || scoped.scopeId === 'position'
            ? 'Beschreib die Position(en) — danach Übernehmen in die Karte.'
            : 'Beschreib, was du brauchst — danach Übernehmen.'
        : 'Ich bin dein Assistent für diesen Editor.'
      : 'Ich bin dein CRM-Assistent.'

  const overSheet = scoped?.layer === 'over-sheet'
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `/api/copilot/entity-snapshot?path=${encodeURIComponent(pathname)}`
        )
        const json = (await res.json()) as { ok?: boolean; snapshot?: string | null }
        if (!cancelled && json.ok && json.snapshot) setPageSnapshot(json.snapshot)
        else if (!cancelled) setPageSnapshot(null)
      } catch {
        if (!cancelled) setPageSnapshot(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, pathname])

  const contextHint = useMemo(() => {
    const base = buildAssistentContextHint(pathname)
    const parts = [base]
    if (pageSnapshot?.trim()) {
      parts.push('', '—— Sichtbare Seite (Entity-Snapshot) ——', pageSnapshot.trim())
    }
    if (autoSession?.contextExtra?.trim()) {
      parts.push(
        '',
        '—— Dashboard-KPI-Analyse ——',
        'Nutze ausschließlich den folgenden Snapshot der aktuell angezeigten Zahlen.',
        autoSession.contextExtra.trim()
      )
    } else if (scopeMeta) {
      const extra = scoped?.extraHint?.trim()
      parts.push('', '—— Editor-KI-Modus ——', scopeMeta.systemHint)
      if (extra) parts.push(`Zusatz: ${extra}`)
    }
    return parts.filter(Boolean).join('\n')
  }, [pathname, scopeMeta, scoped?.extraHint, autoSession?.contextExtra, pageSnapshot])

  contextHintRef.current = contextHint

  const quick = autoSession
    ? [
        { label: 'Nochmal analysieren', prompt: autoSession.autoPrompt },
        {
          label: 'Was zuerst tun?',
          prompt: 'Was ist die eine wichtigste Entscheidung jetzt — und warum?',
        },
        { label: 'Risiken', prompt: 'Welche Risiken oder Engpässe siehst du in den Zahlen?' },
      ]
    : scopeMeta?.quickPrompts ?? QUICK_DEFAULT

  useEffect(() => {
    if (!open || autoSession) return
    const key = scoped ? `${scoped.scopeId}:${scoped.extraHint ?? ''}` : 'general'
    if (lastScopeKey.current === key) return
    lastScopeKey.current = key
    if (scoped && scopeMeta) {
      setMessages([])
      setInput(scoped.draftInput?.trim() || '')
      setError(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else if (!scoped) {
      setMessages([])
      setInput('')
    }
  }, [open, scoped, scopeMeta, autoSession])

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    if (!chatStarted) return
    scrollToBottom(true)
  }, [messages, open, pending, chatStarted, scrollToBottom])

  useEffect(() => {
    const el = bodyRef.current
    if (!el || !chatStarted) {
      setStuckUp(false)
      return
    }
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      setStuckUp(dist > 120)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [chatStarted, messages, open])

  function closePanel() {
    setOpen(false)
    clearScoped()
    clearAutoSession()
    lastScopeKey.current = null
    lastAutoId.current = null
  }

  function resetToGeneral() {
    clearScoped()
    clearAutoSession()
    lastScopeKey.current = null
    lastAutoId.current = null
    setMessages([])
    setInput('')
    setError(null)
  }

  function navigateCrm(href: string) {
    closePanel()
    router.push(href)
  }

  function applyDraftFromMessage(content: string) {
    const draft = parseBwApplyDraft(content)
    if (!draft) {
      toast.error('Kein übernehmbarer Entwurf in der Antwort.')
      return
    }
    setPendingDraft(draft)
    if (scoped?.layer === 'over-sheet') {
      const n =
        draft.type === 'positionen'
          ? draft.items.length
          : draft.type === 'position'
            ? 1
            : 0
      toast.success(
        n > 1 ? `${n} Positionen übernommen` : n === 1 ? 'Position übernommen' : 'Übernommen'
      )
      closePanel()
      return
    }
    toast.success('In Formular übernommen — Fenster schließen oder weiter chatten.')
  }

  function send(text: string, opts?: { historyOverride?: ChatMsg[] }) {
    const msg = text.trim()
    if (!msg || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    setInput('')
    const historyForApi = (
      opts?.historyOverride ?? messages.filter((m) => m.role === 'user' || m.content)
    ).map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: msg }])
    void (async () => {
      try {
        const res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            history: historyForApi,
            contextHint: contextHintRef.current,
          }),
        })
        const json = (await res.json()) as {
          ok?: boolean
          text?: string
          error?: string
          ui?: AssistentUiPayload
        }
        if (!res.ok || !json.ok) {
          setError(json.error || 'Assistent nicht erreichbar.')
          setMessages((m) => [
            ...m,
            {
              role: 'assistant',
              content: json.error || 'Fehler — bitte später erneut versuchen.',
            },
          ])
          return
        }
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: json.text || '—',
            ui: json.ui ?? emptyAssistentUi(),
          },
        ])
      } catch (e) {
        const err = e instanceof Error ? e.message : 'Netzwerkfehler'
        setError(err)
        setMessages((m) => [...m, { role: 'assistant', content: err }])
      } finally {
        pendingRef.current = false
        setPending(false)
      }
    })()
  }

  useEffect(() => {
    if (!open || !autoSession) return
    if (lastAutoId.current === autoSession.id) return
    lastAutoId.current = autoSession.id
    lastScopeKey.current = `auto:${autoSession.id}`
    const introMsg: ChatMsg = { role: 'assistant', content: autoSession.intro }
    setMessages([introMsg])
    setInput('')
    setError(null)
    const t = window.setTimeout(() => {
      send(autoSession.autoPrompt, { historyOverride: [introMsg] })
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoSession])

  if (!open) return null

  const title = autoSession
    ? autoSession.title
    : scopeMeta
      ? `KI · ${scopeMeta.label}`
      : 'Assistent'

  return (
    <>
      <button
        type="button"
        className={cn('assistent-scrim', overSheet && 'assistent-scrim--over-sheet')}
        aria-label="Assistent schließen"
        onClick={closePanel}
      />
      <aside
        className={cn('assistent-panel', overSheet && 'assistent-panel--over-sheet')}
        role="dialog"
        aria-label="Assistent"
      >
        <header className="assistent-panel__head">
          <button
            type="button"
            className="assistent-panel__close"
            onClick={closePanel}
            aria-label="Schließen"
          >
            <MockIcon ctx="btn" n="x" size={16} />
          </button>
          <div className="assistent-panel__head-title min-w-0 flex-1">
            <p className="assistent-panel__title">{title}</p>
          </div>
          {(scoped || autoSession) && !overSheet ? (
            <button
              type="button"
              className="btn ghost sm"
              title="Allgemeinen Assistenten öffnen"
              onClick={resetToGeneral}
            >
              Allgemein
            </button>
          ) : null}
        </header>

        <div className="assistent-panel__body" ref={bodyRef}>
          {!chatStarted ? (
            <div className="assistent-panel__start">
              <p className="assistent-panel__start-headline">{startHeadline}</p>
              <p className="assistent-panel__start-sub">{startSub}</p>
            </div>
          ) : (
            <>
              {messages.map((m, i) => {
                const draft = m.role === 'assistant' ? parseBwApplyDraft(m.content) : null
                const displayRaw =
                  m.role === 'assistant' && draft
                    ? stripBwApplyBlock(m.content)
                    : m.content
                const display =
                  m.role === 'assistant'
                    ? sanitizeAssistentChatText(displayRaw)
                    : displayRaw
                const showBubble = Boolean(display.trim()) || m.role === 'user'
                return (
                  <div
                    key={`${m.role}-${i}`}
                    className={cn('assistent-msg', m.role === 'user' && 'assistent-msg--user')}
                  >
                    {showBubble ? (
                    <div
                      className={cn(
                        'assistent-bubble',
                        m.role === 'assistant' ? 'assistent-bubble--ai' : 'assistent-bubble--user',
                        m.role === 'assistant' && 'assistent-bubble--md'
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <AssistentMarkdown content={display} onNavigate={navigateCrm} />
                      ) : (
                        display
                      )}
                    </div>
                    ) : null}
                    {draft?.type === 'position' ? (
                      <PositionDraftCard
                        draft={draft}
                        disabled={pending}
                        applyLabel={overSheet ? 'Übernehmen' : 'In Formular übernehmen'}
                        onApply={() => applyDraftFromMessage(m.content)}
                      />
                    ) : draft?.type === 'positionen' ? (
                      <PositionenDraftCard
                        draft={draft}
                        disabled={pending}
                        applyLabel={
                          overSheet
                            ? `Alle ${draft.items.length} übernehmen`
                            : `Alle ${draft.items.length} in Formular`
                        }
                        onApply={() => applyDraftFromMessage(m.content)}
                      />
                    ) : draft?.type === 'text' ||
                      draft?.type === 'mail' ||
                      draft?.type === 'maengel' ? (
                      <TextDraftCard
                        draft={draft}
                        disabled={pending}
                        applyLabel={overSheet ? 'Übernehmen' : 'In Formular übernehmen'}
                        onApply={() => applyDraftFromMessage(m.content)}
                      />
                    ) : draft ? (
                      <button
                        type="button"
                        className="btn primary sm mt-2"
                        disabled={pending}
                        onClick={() => applyDraftFromMessage(m.content)}
                      >
                        {overSheet ? 'Übernehmen' : 'In Formular übernehmen'}
                      </button>
                    ) : null}
                    {m.role === 'assistant' && m.ui ? (
                      <AssistentUiBlocks
                        ui={m.ui}
                        disabled={pending}
                        onNavigate={navigateCrm}
                        onConfirm={(prompt) => send(prompt)}
                      />
                    ) : null}
                  </div>
                )
              })}
              {pending ? (
                <div
                  className="assistent-typing assistent-bubble assistent-bubble--ai"
                  role="status"
                  aria-live="polite"
                  aria-label="Assistent schreibt"
                >
                  <span className="assistent-typing__dot" />
                  <span className="assistent-typing__dot" />
                  <span className="assistent-typing__dot" />
                </div>
              ) : null}
              <div ref={bottomRef} />
            </>
          )}

          {stuckUp ? (
            <button
              type="button"
              className="assistent-panel__scroll-down"
              aria-label="Zum Ende scrollen"
              onClick={() => scrollToBottom(true)}
            >
              <MockIcon ctx="btn" n="arrow-down" size={16} />
            </button>
          ) : null}
        </div>

        <div className="assistent-panel__foot">
          {!chatStarted ? (
            <div className="assistent-panel__chips">
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="assistent-chip"
                  disabled={pending}
                  onClick={() => send(q.prompt)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-[length:var(--fs-meta)] text-danger">{error}</p> : null}
          <KiChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            disabled={pending}
            placeholder={scopeMeta?.placeholder ?? 'Nachricht schreiben…'}
            inputRef={inputRef}
          />
        </div>
      </aside>
    </>
  )
}
