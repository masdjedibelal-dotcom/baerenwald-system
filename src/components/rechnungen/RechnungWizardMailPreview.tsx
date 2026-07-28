'use client'

import { useEffect, useState } from 'react'
import { previewRechnungKundeMail } from '@/app/(dashboard)/rechnungen/actions'
import { mailIframeSrcDoc } from '@/lib/mail/mail-iframe-srcdoc'

/** Echte Kunden-Mail wie beim Versand (gleiche Vorlage wie sendRechnung). */
export function RechnungWizardMailPreview({
  rechnungId,
  kundeId,
  betreff,
  einleitung,
  brutto,
  faelligAm,
  projektTitel,
  rechnungsnummer,
  empfaengerHint,
}: {
  rechnungId: string | null
  /** Für Draft-Vorschau ohne gespeicherte Rechnung (z. B. FAB-Direktrechnung). */
  kundeId?: string | null
  betreff?: string
  einleitung?: string | null
  brutto?: number
  faelligAm?: string | null
  projektTitel?: string | null
  rechnungsnummer?: string | null
  empfaengerHint?: string
}) {
  const [html, setHtml] = useState('')
  const [resolvedBetreff, setResolvedBetreff] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      void previewRechnungKundeMail({
        rechnungId: rechnungId?.trim() || null,
        kundeId: kundeId?.trim() || null,
        betreff: betreff?.trim() || undefined,
        einleitung: einleitung?.trim() ? einleitung : null,
        brutto,
        faelligAm,
        projektTitel,
        rechnungsnummer,
      }).then((res) => {
        if (cancelled) return
        setLoading(false)
        if (!res.ok) {
          setError(res.message)
          setHtml('')
          setResolvedBetreff('')
          return
        }
        setError(null)
        setHtml(res.html)
        setResolvedBetreff(res.betreff)
      })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    rechnungId,
    kundeId,
    betreff,
    einleitung,
    brutto,
    faelligAm,
    projektTitel,
    rechnungsnummer,
  ])

  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div
        style={{
          fontSize: 'var(--fs-meta)',
          color: 'var(--text-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span>
          <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>Betreff:</b>{' '}
          {resolvedBetreff || betreff?.trim() || (loading ? '…' : '—')}
        </span>
        {empfaengerHint ? (
          <span>
            <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>An:</b> {empfaengerHint}
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: '0.5px solid var(--border)',
            background: 'var(--bg-soft)',
            fontSize: 'var(--fs-text)',
            color: 'var(--text-2)',
          }}
        >
          Vorschau nicht geladen: {error}
        </div>
      ) : (
        <iframe
          title="E-Mail-Vorschau Rechnung"
          sandbox="allow-same-origin"
          style={{
            width: '100%',
            height: 'min(520px, 55vh)',
            border: '0.5px solid var(--border)',
            borderRadius: 8,
            background: '#fff',
          }}
          srcDoc={mailIframeSrcDoc(
            html,
            loading ? 'Echte E-Mail-Vorlage lädt…' : 'Vorschau lädt…'
          )}
        />
      )}
    </div>
  )
}
