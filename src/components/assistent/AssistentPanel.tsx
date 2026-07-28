'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { buildAssistentContextHint } from '@/lib/copilot/assistent-context'
import {
  emptyAssistentUi,
  type AssistentNavLink,
  type AssistentPreview,
  type AssistentUiPayload,
} from '@/lib/copilot/assistent-ui'
import { cn } from '@/lib/utils'

type ChatMsg = {
  role: 'user' | 'assistant'
  content: string
  ui?: AssistentUiPayload
}

const QUICK = [
  { label: 'Plan heute', prompt: 'Plane meinen Arbeitstag — Fokus und Reihenfolge.' },
  { label: 'Was kannst du?', prompt: 'Was kannst du? Wissen, Ausführen, Navigieren, Vorschau.' },
  { label: 'Offene Rechnungen', prompt: 'Zeige offene und überfällige Rechnungen mit Links.' },
  { label: 'Angebot anlegen', prompt: 'Ich will ein Angebot erstellen — führe mich durch und öffne den Wizard.' },
  { label: 'Mahnung', prompt: 'Welche Rechnungen brauchen eine Mahnung? Zeige Vorschau bevor du sendest.' },
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

export function AssistentPanel() {
  const router = useRouter()
  const { open, setOpen, pathname } = useAssistent()
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Hallo — ich bin dein CRM-Assistent.\n\n• Wissen & Daten\n• Aktionen mit Vorschau im Chat\n• Deep-Links ins richtige Formular (z. B. Angebots-Positionen)\n• Tagesplan\n\nFrag z. B. „Plane heute“ oder „Angebot für Müller + senden“.',
    },
  ])
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function navigateCrm(href: string) {
    setOpen(false)
    router.push(href)
  }

  function send(text: string) {
    const msg = text.trim()
    if (!msg || pending) return
    setError(null)
    setInput('')
    const historyForApi = messages.filter((m) => m.role === 'user' || m.content)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    startTransition(async () => {
      try {
        const res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            history: historyForApi,
            contextHint: buildAssistentContextHint(pathname),
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
      }
    })
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="assistent-scrim"
        aria-label="Assistent schließen"
        onClick={() => setOpen(false)}
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
            <p className="text-[length:var(--fs-text)] font-semibold text-bw-text">Assistent</p>
            <p className="truncate text-[length:var(--fs-meta)] text-bw-text-muted">
              Wissen · Ausführen · Springen · {pathname}
            </p>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setOpen(false)}
            aria-label="Schließen"
          >
            <MockIcon ctx="btn" n="x" size={16} />
          </button>
        </header>

        <div className="assistent-panel__body">
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`}>
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-[length:var(--fs-text)] leading-relaxed whitespace-pre-wrap',
                  m.role === 'assistant'
                    ? 'bg-bw-surface-2 text-bw-text'
                    : 'ml-6 bg-[#2E7D52] text-white'
                )}
              >
                {m.content}
              </div>
              {m.role === 'assistant' && m.ui ? (
                <AssistentUiBlocks
                  ui={m.ui}
                  disabled={pending}
                  onNavigate={navigateCrm}
                  onConfirm={(prompt) => send(prompt)}
                />
              ) : null}
            </div>
          ))}
          {pending ? (
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Denkt nach…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="assistent-panel__foot">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
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
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              className="sel min-w-0 flex-1"
              placeholder="Fragen, Auftrag oder „öffne Positionen“…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={pending}
            />
            <button type="submit" className="btn primary sm" disabled={pending || !input.trim()}>
              <MockIcon ctx="btn" n="send" size={14} />
            </button>
          </form>
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Vorschau im Chat — Versand erst mit „Jetzt ausführen“.
          </p>
        </div>
      </aside>
    </>
  )
}
