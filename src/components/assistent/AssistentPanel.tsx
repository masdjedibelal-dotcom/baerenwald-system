'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { KiChatComposer } from '@/components/assistent/KiChatComposer'
import { buildAssistentContextHint } from '@/lib/copilot/assistent-context'
import {
  getKiAssistScope,
  parseBwApplyDraft,
  stripBwApplyBlock,
} from '@/lib/copilot/ki-assist-scopes'
import {
  emptyAssistentUi,
  type AssistentNavLink,
  type AssistentPreview,
  type AssistentUiPayload,
} from '@/lib/copilot/assistent-ui'
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

const DEFAULT_INTRO: ChatMsg = {
  role: 'assistant',
  content:
    'Hallo — ich bin dein CRM-Assistent.\n\n• Wissen & Daten\n• Aktionen mit Vorschau im Chat\n• Deep-Links ins richtige Formular (z. B. Angebots-Positionen)\n• Tagesplan\n\nFrag z. B. „Plane heute“ oder „Angebot für Müller + senden“.',
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

  const [messages, setMessages] = useState<ChatMsg[]>([DEFAULT_INTRO])
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pageSnapshot, setPageSnapshot] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastScopeKey = useRef<string | null>(null)
  const lastAutoId = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const contextHintRef = useRef('')

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
        { label: 'Was zuerst tun?', prompt: 'Was ist die eine wichtigste Entscheidung jetzt — und warum?' },
        { label: 'Risiken', prompt: 'Welche Risiken oder Engpässe siehst du in den Zahlen?' },
      ]
    : scopeMeta?.quickPrompts ?? QUICK_DEFAULT

  // Neuer Scope → Chat auf Modus zurücksetzen (nicht bei Auto-Analyse)
  useEffect(() => {
    if (!open || autoSession) return
    const key = scoped ? `${scoped.scopeId}:${scoped.extraHint ?? ''}` : 'general'
    if (lastScopeKey.current === key) return
    lastScopeKey.current = key
    if (scoped && scopeMeta) {
      setMessages([{ role: 'assistant', content: scopeMeta.intro.replace(/\*\*/g, '') }])
      setInput(scoped.draftInput?.trim() || '')
      setError(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else if (!scoped) {
      setMessages([DEFAULT_INTRO])
      setInput('')
    }
  }, [open, scoped, scopeMeta, autoSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function closePanel() {
    setOpen(false)
    clearScoped()
    clearAutoSession()
    lastScopeKey.current = null
    lastAutoId.current = null
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
    toast.success('In Formular übernommen — Fenster schließen oder weiter chatten.')
  }

  function send(text: string, opts?: { historyOverride?: ChatMsg[] }) {
    const msg = text.trim()
    if (!msg || pendingRef.current) return
    pendingRef.current = true
    setError(null)
    setInput('')
    const historyForApi = (
      opts?.historyOverride ?? messages.filter((m) => m.role === 'user' || m.content)
    ).map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: msg }])
    startTransition(async () => {
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
      }
    })
  }

  // Dashboard-/Auto-Analyse: Intro + einmalig Prompt senden
  useEffect(() => {
    if (!open || !autoSession) return
    if (lastAutoId.current === autoSession.id) return
    lastAutoId.current = autoSession.id
    lastScopeKey.current = `auto:${autoSession.id}`
    const introMsg: ChatMsg = { role: 'assistant', content: autoSession.intro }
    setMessages([introMsg])
    setInput('')
    setError(null)
    // contextHint in Closure kann noch alt sein — kleinen Tick warten
    const t = window.setTimeout(() => {
      send(autoSession.autoPrompt, { historyOverride: [introMsg] })
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei neuer Auto-Session
  }, [open, autoSession])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="assistent-scrim"
        aria-label="Assistent schließen"
        onClick={closePanel}
      />
      <aside className="assistent-panel" role="dialog" aria-label="Assistent">
        <div className="assistent-panel__handle" aria-hidden>
          <span />
        </div>
        <header className="assistent-panel__head">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--green-50)] text-[var(--green)]">
            <MockIcon ctx="btn" n="sparkles" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--fs-text)] font-semibold text-bw-text">
              {autoSession
                ? autoSession.title
                : scopeMeta
                  ? `KI · ${scopeMeta.label}`
                  : 'Assistent'}
            </p>
            <p className="truncate text-[length:var(--fs-meta)] text-bw-text-muted">
              {autoSession
                ? 'KPI-Analyse für den Geschäftsführer'
                : scopeMeta
                  ? 'Bereit für diesen Editor — beschreiben & übernehmen'
                  : `Wissen · Ausführen · Springen · ${pathname}`}
            </p>
          </div>
          {scoped || autoSession ? (
            <button
              type="button"
              className="btn ghost sm"
              title="Allgemeinen Assistenten öffnen"
              onClick={() => {
                clearScoped()
                clearAutoSession()
                lastScopeKey.current = null
                lastAutoId.current = null
                setMessages([DEFAULT_INTRO])
                setInput('')
              }}
            >
              Allgemein
            </button>
          ) : null}
          <button
            type="button"
            className="btn ghost sm"
            onClick={closePanel}
            aria-label="Schließen"
          >
            <MockIcon ctx="btn" n="x" size={16} />
          </button>
        </header>

        <div className="assistent-panel__body">
          {messages.map((m, i) => {
            const draft = m.role === 'assistant' ? parseBwApplyDraft(m.content) : null
            const display =
              m.role === 'assistant' && draft ? stripBwApplyBlock(m.content) || m.content : m.content
            return (
              <div key={`${m.role}-${i}`}>
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-[length:var(--fs-text)] leading-relaxed whitespace-pre-wrap',
                    m.role === 'assistant'
                      ? 'bg-bw-surface-2 text-bw-text'
                      : 'ml-6 bg-[#2E7D52] text-white'
                  )}
                >
                  {display}
                </div>
                {draft ? (
                  <button
                    type="button"
                    className="btn primary sm mt-2"
                    disabled={pending}
                    onClick={() => applyDraftFromMessage(m.content)}
                  >
                    In Formular übernehmen
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
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Denkt nach…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="assistent-panel__foot">
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                className="rounded-full border border-bw-border bg-white px-2.5 py-1 text-[length:var(--fs-meta)] text-bw-text hover:bg-bw-surface-2 active:scale-[0.97]"
                disabled={pending}
                onClick={() => send(q.prompt)}
              >
                {q.label}
              </button>
            ))}
          </div>
          {error ? <p className="text-[length:var(--fs-meta)] text-danger">{error}</p> : null}
          <KiChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            disabled={pending}
            placeholder={
              scopeMeta?.placeholder ?? 'Fragen, Auftrag oder „öffne Positionen“…'
            }
            inputRef={inputRef}
          />
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            {autoSession
              ? 'Analyse basiert auf den aktuell sichtbaren Dashboard-Zahlen.'
              : scopeMeta
                ? 'Antwort mit „In Formular übernehmen“ füllt das offene Feld.'
                : 'Vorschau im Chat — Versand erst mit „Jetzt ausführen“.'}
          </p>
        </div>
      </aside>
    </>
  )
}
