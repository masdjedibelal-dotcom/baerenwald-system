'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { cn } from '@/lib/utils'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const QUICK = [
  'Was braucht heute meine Aufmerksamkeit?',
  'Überfällige Rechnungen zeigen',
  'Neue Anfrage anlegen',
  'Umsatz diesen Monat',
]

export function AssistentPanel() {
  const { open, setOpen, pathname } = useAssistent()
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Hallo 👋 Ich bin dein Bärenwald-Assistent. Ich kann Vorgänge zusammenfassen, Angebote & Rechnungen vorbereiten, Handwerker vorschlagen und Aktionen für dich ausführen.',
    },
  ])
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function send(text: string) {
    const msg = text.trim()
    if (!msg || pending) return
    setError(null)
    setInput('')
    const nextHistory = [...messages, { role: 'user' as const, content: msg }]
    setMessages(nextHistory)
    startTransition(async () => {
      try {
        const res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            history: messages.filter((m) => m.role === 'user' || m.content),
            contextHint: `Aktuelle Route: ${pathname}`,
          }),
        })
        const json = (await res.json()) as { ok?: boolean; text?: string; error?: string }
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
        setMessages((m) => [...m, { role: 'assistant', content: json.text || '—' }])
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
        className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent"
        aria-label="Assistent schließen"
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[70] flex h-full w-full max-w-[400px] flex-col border-l border-bw-border bg-white shadow-xl'
        )}
        role="dialog"
        aria-label="Assistent"
      >
        <header className="flex items-center gap-2 border-b border-bw-border px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2E7D52] text-white">
            <MockIcon ctx="btn" n="sparkles" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-bw-text">Assistent</p>
            <p className="truncate text-[11px] text-bw-text-muted">{pathname}</p>
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

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn(
                'rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap',
                m.role === 'assistant'
                  ? 'bg-bw-surface-2 text-bw-text'
                  : 'ml-6 bg-[#2E7D52] text-white'
              )}
            >
              {m.content}
            </div>
          ))}
          {pending ? (
            <p className="text-[12px] text-bw-text-muted">Denkt nach…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2 border-t border-bw-border px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-full border border-bw-border bg-white px-2.5 py-1 text-[11px] text-bw-text hover:bg-bw-surface-2"
                disabled={pending}
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
          {error ? <p className="text-[11px] text-danger">{error}</p> : null}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              className="sel min-w-0 flex-1"
              placeholder="Frag den Assistenten oder gib eine Aufgabe…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={pending}
            />
            <button type="submit" className="btn primary sm" disabled={pending || !input.trim()}>
              <MockIcon ctx="btn" n="send" size={14} />
            </button>
          </form>
          <p className="text-[10px] text-bw-text-muted">
            KI kann Fehler machen. Versand & Beauftragung immer prüfen.
          </p>
        </div>
      </aside>
    </>
  )
}
