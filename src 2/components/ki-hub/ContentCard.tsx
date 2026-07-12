'use client'

import { Check, Copy, ImageIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { KiEmpfehlungRow } from '@/lib/ki-hub/types'

type Props = {
  empfehlung: KiEmpfehlungRow
  onMarkDone: (id: string) => Promise<void>
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text)
}

export function ContentCard({ empfehlung, onMarkDone }: Props) {
  const [generating, setGenerating] = useState(false)
  const [doneLoading, setDoneLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bildUrl, setBildUrl] = useState(empfehlung.content?.bild_url ?? null)
  const [error, setError] = useState<string | null>(null)

  const content = empfehlung.content
  const text = content?.text?.trim()
  const hashtags = content?.hashtags?.filter(Boolean) ?? []
  const bildPrompt = content?.bild_prompt?.trim()
  const plattform = content?.typ ?? 'instagram'

  async function handleCopy() {
    const parts = [text, hashtags.length ? hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ') : '']
      .filter(Boolean)
      .join('\n\n')
    copyText(parts || empfehlung.titel)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleGenerate() {
    if (!bildPrompt) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ki-hub/content/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empfehlung_id: empfehlung.id,
          bild_prompt: bildPrompt,
        }),
      })
      const json = (await res.json()) as { error?: string; bild_url?: string }
      if (!res.ok) throw new Error(json.error ?? 'Fehler')
      if (json.bild_url) setBildUrl(json.bild_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDone() {
    setDoneLoading(true)
    try {
      await onMarkDone(empfehlung.id)
    } finally {
      setDoneLoading(false)
    }
  }

  return (
    <article className="rounded-xl border border-bw-border border-l-4 border-l-[#2E7D52] bg-bw-card p-4 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {plattform} · Marketing
        </p>
        <h3 className="mt-1 text-sm font-semibold text-bw-text">{empfehlung.titel}</h3>
        {empfehlung.beschreibung ? (
          <p className="mt-1 text-xs text-muted">{empfehlung.beschreibung}</p>
        ) : null}
      </div>

      {text ? (
        <div className="mt-3 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-sm text-bw-text whitespace-pre-wrap">
          {text}
        </div>
      ) : null}

      {hashtags.length > 0 ? (
        <p className="mt-2 text-xs text-[#2E7D52]">
          {hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
        </p>
      ) : null}

      {bildPrompt ? (
        <p className="mt-2 rounded-lg bg-bw-bg px-3 py-2 text-xs text-muted">
          <span className="font-medium text-bw-text">Bild-Prompt:</span> {bildPrompt}
        </p>
      ) : null}

      {bildUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-bw-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bildUrl} alt="Generiertes Marketing-Bild" className="max-h-80 w-full object-cover" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {text ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-lg border border-bw-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bw-bg"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Kopiert' : 'Text kopieren'}
          </button>
        ) : null}
        {bildPrompt ? (
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2E7D52] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            {generating ? 'Generiert…' : bildUrl ? 'Neu generieren' : 'Bild generieren'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleDone()}
          disabled={doneLoading}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Erledigt
        </button>
      </div>
    </article>
  )
}
