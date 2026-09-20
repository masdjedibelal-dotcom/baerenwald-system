'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useState } from 'react'
import { C } from '@/lib/tokens/colors'
/** Step „Vorschau“: Angebots-PDF wie beim Versand (HTML-Template = PDF-Layout). */
export function AngebotWizardPdfPreview({
  angebotId,
  loading,
  kundeName,
}: {
  angebotId: string | null
  loading?: boolean
  kundeName?: string
}) {
  const [failed, setFailed] = useState(false)
  const previewSrc = angebotId
    ? `/api/angebot-pdf?angebotId=${encodeURIComponent(angebotId)}&preview=html`
    : null
  const pdfHref = angebotId
    ? `/api/angebot-pdf?angebotId=${encodeURIComponent(angebotId)}`
    : null

  useEffect(() => {
    setFailed(false)
  }, [angebotId])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          {kundeName
            ? `So sieht ${kundeName} das Angebot`
            : 'So sieht der Empfänger das Angebot'}
        </span>
      </div>

      {loading || !previewSrc ? (
        <MockCard
          flush
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 'var(--fs-text)',
          }}
        >
          <MockIcon ctx="default" n="hourglass" size={22} />
          <div style={{ marginTop: 10 }}>Vorschau wird vorbereitet…</div>
        </MockCard>
      ) : failed ? (
        <MockCard
          flush
          style={{
            padding: 32,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>
            Vorschau konnte nicht geladen werden.
          </div>
          {pdfHref ? (
            <MockBtn
              sm
              kind="ghost"
              icon="external-link"
              onClick={() => window.open(pdfHref, '_blank')}
            >
              PDF öffnen
            </MockBtn>
          ) : null}
        </MockCard>
      ) : (
        <MockCard flush style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '0.5rem 0.75rem',
              borderBottom: '0.0.3125remrem solid var(--border)',
              background: 'var(--bg-soft)',
            }}
          >
            {pdfHref ? (
              <MockBtn
                sm
                kind="ghost"
                icon="download"
                onClick={() => window.open(pdfHref, '_blank')}
              >
                PDF herunterladen
              </MockBtn>
            ) : null}
          </div>
          <iframe
            key={previewSrc}
            title="Angebots-PDF-Vorschau"
            src={previewSrc}
            onError={() => setFailed(true)}
            style={{
              width: '100%',
              height: 'min(72vh, 51.25rem)',
              border: 0,
              background: C.white,
              display: 'block',
            }}
          />
        </MockCard>
      )}
    </>
  )
}
