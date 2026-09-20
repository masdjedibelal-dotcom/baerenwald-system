'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
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
    <article className="rounded-sheet border border-bw-border border-l-4 border-l-bw-primary bg-surface p-4 shadow-sm">
      <div>
        <p className="text-fs-caption font-semibold uppercase tracking-wider text-muted">
          {plattform} · Marketing
        </p>
        <h3 className="mt-1 text-sm font-semibold text-bw-text">{empfehlung.titel}</h3>
        {empfehlung.beschreibung ? (
          <p className="mt-1 text-xs text-muted">{empfehlung.beschreibung}</p>
        ) : null}
      </div>

      {text ? (
        <div className="mt-3 rounded-card border border-bw-border bg-bw-bg px-3 py-2 text-sm text-bw-text whitespace-pre-wrap">
          {text}
        </div>
      ) : null}

      {hashtags.length > 0 ? (
        <p className="mt-2 text-xs text-bw-primary">
          {hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
        </p>
      ) : null}

      {bildPrompt ? (
        <p className="mt-2 rounded-card bg-bw-bg px-3 py-2 text-xs text-muted">
          <span className="font-medium text-bw-text">Bild-Prompt:</span> {bildPrompt}
        </p>
      ) : null}

      {bildUrl ? (
        <div className="mt-3 overflow-hidden rounded-card border border-bw-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bildUrl} alt="Generiertes Marketing-Bild" className="max-h-80 w-full object-cover" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-danger">{error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {text ? (
          <MockBtn className="inline-flex items-center gap-1 rounded-button border border-bw-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bw-bg" type="button" onClick={() => void handleCopy()}>
            {copied ? <MockIcon n="check" ctx="default" className="h-3.5 w-3.5" /> : <MockIcon n="copy" ctx="default" className="h-3.5 w-3.5" />}
            {copied ? 'Kopiert' : 'Text kopieren'}
          </MockBtn>
        ) : null}
        {bildPrompt ? (
          <MockBtn
            type="button"
            kind="primary"
            sm
            loading={generating}
            onClick={() => void handleGenerate()}
          >
            {!generating ? <MockIcon n="photo" ctx="default" className="h-3.5 w-3.5" /> : null}
            {generating ? 'Generiert…' : bildUrl ? 'Neu generieren' : 'Bild generieren'}
          </MockBtn>
        ) : null}
        <MockBtn className="inline-flex items-center gap-1 rounded-button border border-status-order-bg bg-status-order-bg px-3 py-1.5 text-xs font-medium text-status-order-text hover:bg-status-order-bg disabled:opacity-50" type="button" onClick={() => void handleDone()} disabled={doneLoading}>
          <MockIcon n="check" ctx="default" className="h-3.5 w-3.5" />
          Erledigt
        </MockBtn>
      </div>
    </article>
  )
}
