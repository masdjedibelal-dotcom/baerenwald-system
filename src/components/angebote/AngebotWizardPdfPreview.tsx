'use client'

import { useEffect, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'

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
        className="section-h"
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          textTransform: 'none',
          letterSpacing: 0,
          fontSize: 'var(--fs-text)',
          fontWeight: 600,
        }}
      >
        <span>Angebots-PDF</span>
        <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 'var(--fs-meta)' }}>
          {kundeName
            ? `So erhält ${kundeName} das Angebot`
            : 'Vorschau wie beim Kundenversand'}
        </span>
      </div>

      {loading || !previewSrc ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 'var(--fs-text)',
          }}
        >
          <MockIcon ctx="default" n="hourglass" size={22} />
          <div style={{ marginTop: 10 }}>Vorschau wird vorbereitet…</div>
        </div>
      ) : failed ? (
        <div
          className="card"
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
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '8px 12px',
              borderBottom: '0.5px solid var(--border)',
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
              height: 'min(72vh, 820px)',
              border: 0,
              background: '#fff',
              display: 'block',
            }}
          />
        </div>
      )}
    </>
  )
}
