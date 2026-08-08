'use client'

import { useEffect, useState } from 'react'
import { previewAngebotKundeMail } from '@/app/(dashboard)/angebote/actions'
import { mailIframeSrcDoc } from '@/lib/mail/mail-iframe-srcdoc'

/** Echte Kunden-Mail wie beim Versand (gleiche Vorlage wie sendAngebotToKunde). */
export function AngebotWizardMailPreview({
  angebotId,
  betreff,
  einleitung,
  schluss,
  leistungsumfang,
  gesamtBrutto,
  gesamtNetto,
  gueltigBis,
  empfaengerHint,
}: {
  angebotId: string | null
  betreff?: string
  einleitung?: string | null
  schluss?: string | null
  leistungsumfang?: string | null
  /** Live-Wizard-Summen (sonst DB-Stand = oft veraltet). */
  gesamtBrutto?: number | null
  gesamtNetto?: number | null
  gueltigBis?: string | null
  empfaengerHint?: string
}) {
  const [html, setHtml] = useState('')
  const [resolvedBetreff, setResolvedBetreff] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!angebotId) {
      setHtml('')
      setResolvedBetreff('')
      setError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      void previewAngebotKundeMail({
        angebotId,
        betreff: betreff?.trim() || undefined,
        einleitung,
        schluss,
        leistungsumfang,
        gesamtBrutto,
        gesamtNetto,
        gueltigBis,
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
    angebotId,
    betreff,
    einleitung,
    schluss,
    leistungsumfang,
    gesamtBrutto,
    gesamtNetto,
    gueltigBis,
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
          title="E-Mail-Vorschau Angebot"
          sandbox=""
          style={{
            width: '100%',
            height: 'min(520px, 55vh)',
            border: '0.5px solid var(--border)',
            borderRadius: 8,
            background: '#fff',
          }}
          srcDoc={mailIframeSrcDoc(
            html,
            !angebotId
              ? 'Angebot wird gespeichert…'
              : loading
                ? 'Echte E-Mail-Vorlage lädt…'
                : 'Vorschau lädt…'
          )}
        />
      )}
    </div>
  )
}
