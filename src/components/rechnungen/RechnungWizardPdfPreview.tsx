'use client'

import { useEffect, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/** HTML/PDF-Vorschau einer gespeicherten Rechnung. */
export function RechnungWizardPdfPreview({
  rechnungId,
  loading,
  kundeName,
}: {
  rechnungId: string | null
  loading?: boolean
  kundeName?: string
}) {
  const [failed, setFailed] = useState(false)
  const previewSrc = rechnungId
    ? `/api/rechnung-pdf?rechnungId=${encodeURIComponent(rechnungId)}&preview=html`
    : null
  const pdfHref = rechnungId
    ? `/api/rechnung-pdf?rechnungId=${encodeURIComponent(rechnungId)}`
    : null

  useEffect(() => {
    setFailed(false)
  }, [rechnungId])

  if (loading || !previewSrc) {
    return (
      <div
        className="card"
        style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}
      >
        <MockIcon ctx="default" n="hourglass" size={22} />
        <div style={{ marginTop: 10 }}>Rechnungsvorschau wird vorbereitet…</div>
      </div>
    )
  }

  if (failed) {
    return (
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
          <MockBtn sm kind="ghost" icon="external-link" onClick={() => window.open(pdfHref, '_blank')}>
            PDF öffnen
          </MockBtn>
        ) : null}
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--bg-soft)',
          fontSize: 'var(--fs-meta)',
          color: 'var(--text-3)',
        }}
      >
        <span>
          {kundeName ? `So erhält ${kundeName} die Rechnung` : 'Rechnungsvorschau'}
        </span>
        {pdfHref ? (
          <MockBtn sm kind="ghost" icon="download" onClick={() => window.open(pdfHref, '_blank')}>
            PDF
          </MockBtn>
        ) : null}
      </div>
      <iframe
        key={previewSrc}
        title="Rechnungs-PDF-Vorschau"
        src={previewSrc}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: 'min(56vh, 640px)',
          border: 0,
          background: '#fff',
          display: 'block',
        }}
      />
    </div>
  )
}
