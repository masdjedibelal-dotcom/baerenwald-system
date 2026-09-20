'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useState } from 'react'
import { rechnungPdfHref } from '@/lib/rechnungen/rechnung-pdf-href'
import { C } from '@/lib/tokens/colors'

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
  const pdfHref = rechnungId ? rechnungPdfHref(rechnungId) : null

  useEffect(() => {
    setFailed(false)
  }, [rechnungId])

  if (loading || !previewSrc) {
    return (
      <MockCard
        flush
        style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}
      >
        <MockIcon ctx="default" n="hourglass" size={22} />
        <div style={{ marginTop: 10 }}>Rechnungsvorschau wird vorbereitet…</div>
      </MockCard>
    )
  }

  if (failed) {
    return (
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
          <MockBtn sm kind="ghost" icon="external-link" onClick={() => window.open(pdfHref, '_blank')}>
            PDF öffnen
          </MockBtn>
        ) : null}
      </MockCard>
    )
  }

  return (
    <MockCard flush style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          padding: '0.5rem 0.75rem',
          borderBottom: '0.0.3125remrem solid var(--border)',
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
          height: 'min(56vh, 40rem)',
          border: 0,
          background: C.white,
          display: 'block',
        }}
      />
    </MockCard>
  )
}
