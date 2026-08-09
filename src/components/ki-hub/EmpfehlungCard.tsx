'use client'

import Link from 'next/link'
import { Check, Copy, ExternalLink, Mail, X } from 'lucide-react'
import { useState } from 'react'
import { crmHref, KI_DEPTH_ANCHOR, parseAktionPayload } from '@/lib/ki-hub/deep-links'
import type { KiEmpfehlungRow } from '@/lib/ki-hub/types'

const PRIO_STYLES: Record<string, string> = {
  kritisch: 'border-l-red-500 bg-red-50/50',
  hoch: 'border-l-amber-500',
  mittel: 'border-l-[#2E7D52]',
  info: 'border-l-gray-300',
}

type Props = {
  empfehlung: KiEmpfehlungRow
  onMarkDone: (id: string) => Promise<void>
  onOpenDepth?: () => void
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text)
}

export function EmpfehlungCard({ empfehlung, onMarkDone, onOpenDepth }: Props) {
  const [doneLoading, setDoneLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)
  const [mailLoading, setMailLoading] = useState(false)
  const [mailError, setMailError] = useState<string | null>(null)
  const [mailPreview, setMailPreview] = useState<{
    to: string
    betreff: string
    text_vorschau: string
  } | null>(null)

  const border = PRIO_STYLES[empfehlung.prioritaet] ?? PRIO_STYLES.mittel
  const contentText = empfehlung.content?.text?.trim()
  const payload = parseAktionPayload(empfehlung.aktion_payload)
  const crmPath = crmHref(payload)
  const externalUrl = payload.url ?? null
  const showMail =
    empfehlung.aktion_typ === 'send_mail' ||
    empfehlung.content?.typ === 'mail' ||
    Boolean(empfehlung.content?.betreff)

  const mailDefaults = {
    to: '',
    betreff: empfehlung.content?.betreff ?? empfehlung.titel,
    text: contentText ?? empfehlung.beschreibung ?? '',
    lead_id: payload.lead_id ?? (empfehlung.daten_basis as { lead_ids?: string[] } | null)?.lead_ids?.[0],
  }

  async function handleCopy() {
    const text = contentText || empfehlung.beschreibung || empfehlung.titel
    copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDone() {
    setDoneLoading(true)
    try {
      await onMarkDone(empfehlung.id)
    } finally {
      setDoneLoading(false)
    }
  }

  function handleCrmClick() {
    if (payload.anchor === KI_DEPTH_ANCHOR) {
      onOpenDepth?.()
      const el = document.getElementById(KI_DEPTH_ANCHOR)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function handleMailPreview() {
    setMailLoading(true)
    setMailError(null)
    try {
      const res = await fetch('/api/ki-hub/action/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mailDefaults,
          empfehlung_id: empfehlung.id,
          preview: true,
        }),
      })
      const json = (await res.json()) as {
        error?: string
        to?: string
        betreff?: string
        text_vorschau?: string
      }
      if (!res.ok) throw new Error(json.error ?? 'Vorschau fehlgeschlagen')
      setMailPreview({
        to: json.to ?? '',
        betreff: json.betreff ?? mailDefaults.betreff,
        text_vorschau: json.text_vorschau ?? mailDefaults.text,
      })
      setMailOpen(true)
    } catch (e) {
      setMailError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setMailLoading(false)
    }
  }

  async function handleMailSend() {
    setMailLoading(true)
    setMailError(null)
    try {
      const res = await fetch('/api/ki-hub/action/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mailDefaults,
          empfehlung_id: empfehlung.id,
          preview: false,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Versand fehlgeschlagen')
      setMailOpen(false)
      await onMarkDone(empfehlung.id)
    } catch (e) {
      setMailError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setMailLoading(false)
    }
  }

  return (
    <>
      <article
        className={`rounded-xl border border-bw-border border-l-4 bg-bw-card p-4 shadow-sm ${border}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {empfehlung.prioritaet} · {empfehlung.bereich}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-bw-text">{empfehlung.titel}</h3>
          </div>
        </div>

        {empfehlung.beschreibung ? (
          <p className="mt-2 text-sm text-bw-text/90">{empfehlung.beschreibung}</p>
        ) : null}

        {contentText ? (
          <div className="mt-3 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-sm text-bw-text whitespace-pre-wrap">
            {empfehlung.content?.betreff ? (
              <p className="mb-1 text-xs font-medium text-muted">
                Betreff: {empfehlung.content.betreff}
              </p>
            ) : null}
            {contentText}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {contentText || empfehlung.beschreibung ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 rounded-lg border border-bw-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bw-bg"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          ) : null}
          {showMail ? (
            <button
              type="button"
              onClick={() => void handleMailPreview()}
              disabled={mailLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" />
              Mail senden
            </button>
          ) : null}
          {crmPath && payload.anchor === KI_DEPTH_ANCHOR && !payload.path ? (
            <button
              type="button"
              onClick={handleCrmClick}
              className="inline-flex items-center gap-1 rounded-lg bg-bw-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Analysen öffnen
            </button>
          ) : null}
          {crmPath && (payload.path || payload.anchor !== KI_DEPTH_ANCHOR) ? (
            <Link
              href={crmPath}
              onClick={payload.anchor === KI_DEPTH_ANCHOR ? handleCrmClick : undefined}
              className="inline-flex items-center gap-1 rounded-lg bg-bw-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Im CRM öffnen
            </Link>
          ) : null}
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-bw-border px-3 py-1.5 text-xs font-medium hover:bg-bw-bg"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Link öffnen
            </a>
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
        {mailError && !mailOpen ? (
          <p className="mt-2 text-xs text-red-700">{mailError}</p>
        ) : null}
      </article>

      {mailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-bw-border bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-bw-text">Mail-Vorschau</h3>
              <button
                type="button"
                onClick={() => setMailOpen(false)}
                className="rounded p-1 hover:bg-bw-bg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">An</dt>
                <dd className="font-medium">{mailPreview?.to ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Betreff</dt>
                <dd>{mailPreview?.betreff}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Text</dt>
                <dd className="whitespace-pre-wrap rounded-lg bg-bw-bg p-2 text-xs">
                  {mailPreview?.text_vorschau}
                </dd>
              </div>
            </dl>
            {mailError ? <p className="mt-2 text-xs text-red-700">{mailError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMailOpen(false)}
                className="rounded-lg border border-bw-border px-3 py-1.5 text-xs font-medium"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void handleMailSend()}
                disabled={mailLoading}
                className="rounded-lg bg-bw-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {mailLoading ? 'Sendet…' : 'Jetzt senden'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
