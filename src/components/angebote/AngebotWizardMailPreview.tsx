'use client'

import { useEffect, useState } from 'react'
import {
  previewAngebotKundeMail,
  previewAngebotWizardMailLive,
} from '@/app/(dashboard)/angebote/actions'
import { mailIframeSrcDoc } from '@/lib/mail/mail-iframe-srcdoc'

/** Echte Kunden-Mail wie beim Versand — live aus Wizard ohne Entwurf, oder aus gespeichertem Angebot. */
export function AngebotWizardMailPreview({
  angebotId,
  /** true = nur Live-Vorschau, kein Speichern / kein DB-Angebot nötig */
  liveOnly = false,
  betreff,
  einleitung,
  schluss,
  leistungsumfang,
  gesamtBrutto,
  gesamtNetto,
  gueltigBis,
  empfaengerHint,
  anrede,
  kundeName,
  kundeVorname,
  kundeNachname,
  kundeTyp,
  reverseCharge,
  unterSchwelleDirekt,
  portalAudience,
}: {
  angebotId: string | null
  liveOnly?: boolean
  betreff?: string
  einleitung?: string | null
  schluss?: string | null
  leistungsumfang?: string | null
  /** Live-Wizard-Summen (sonst DB-Stand = oft veraltet). */
  gesamtBrutto?: number | null
  gesamtNetto?: number | null
  gueltigBis?: string | null
  empfaengerHint?: string
  anrede?: 'du' | 'sie'
  kundeName?: string | null
  kundeVorname?: string | null
  kundeNachname?: string | null
  kundeTyp?: string | null
  reverseCharge?: boolean
  unterSchwelleDirekt?: boolean
  portalAudience?: 'privat' | 'organisation'
}) {
  const [html, setHtml] = useState('')
  const [resolvedBetreff, setResolvedBetreff] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const useLive = liveOnly || !angebotId

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const res = useLive
            ? await previewAngebotWizardMailLive({
                betreff: betreff?.trim() || undefined,
                einleitung,
                schluss,
                leistungsumfang,
                gesamtBrutto,
                gueltigBis,
                anrede,
                kundeName,
                kundeVorname,
                kundeNachname,
                kundeTyp,
                reverseCharge,
                unterSchwelleDirekt,
                portalAudience,
              })
            : await previewAngebotKundeMail({
                angebotId: angebotId!,
                betreff: betreff?.trim() || undefined,
                einleitung,
                schluss,
                leistungsumfang,
                gesamtBrutto,
                gesamtNetto,
                gueltigBis,
              })
          if (cancelled) return
          if (!res?.ok) {
            setError(
              res && 'message' in res && res.message
                ? res.message
                : 'E-Mail-Vorschau konnte nicht geladen werden'
            )
            setHtml('')
            setResolvedBetreff('')
            return
          }
          setError(null)
          setHtml(res.html)
          setResolvedBetreff(res.betreff)
        } catch (e) {
          if (cancelled) return
          setError(
            e instanceof Error ? e.message : 'E-Mail-Vorschau konnte nicht geladen werden'
          )
          setHtml('')
          setResolvedBetreff('')
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    useLive,
    angebotId,
    betreff,
    einleitung,
    schluss,
    leistungsumfang,
    gesamtBrutto,
    gesamtNetto,
    gueltigBis,
    anrede,
    kundeName,
    kundeVorname,
    kundeNachname,
    kundeTyp,
    reverseCharge,
    unterSchwelleDirekt,
    portalAudience,
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
            loading ? 'E-Mail-Vorschau wird geladen…' : 'Vorschau lädt…'
          )}
        />
      )}
    </div>
  )
}
