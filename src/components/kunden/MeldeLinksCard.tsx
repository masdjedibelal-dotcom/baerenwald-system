'use client'

import { useEffect, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { toast } from '@/components/ui/app-toast'

/** Melde-Link + QR (HV oder Objekt) — optional Aushang-PDF. */
export function MeldeLinksCard({
  orgSlug,
  meldeSlug,
  qrLabel = 'QR-Code Hausverwaltung',
  aushangPdfHref,
}: {
  orgSlug: string
  meldeSlug?: string | null
  qrLabel?: string
  aushangPdfHref?: string | null
}) {
  const meldeLink = buildMeldeLink(orgSlug, meldeSlug)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const qrFileSlug = meldeSlug?.trim()
    ? `melde-qr-${orgSlug}-${meldeSlug.trim().toLowerCase()}.png`
    : `melde-qr-${orgSlug}.png`

  useEffect(() => {
    let cancelled = false
    void import('qrcode').then((QRCode) =>
      QRCode.toDataURL(meldeLink, {
        width: 360,
        margin: 2,
        color: { dark: '#1A3D2B', light: '#FFFFFF' },
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
    )
    return () => {
      cancelled = true
    }
  }, [meldeLink])

  function kopieren() {
    void navigator.clipboard.writeText(meldeLink).then(
      () => toast.success('Melde-Link kopiert'),
      () => toast.error('Kopieren fehlgeschlagen')
    )
  }

  function downloadQr() {
    if (!qrDataUrl) {
      toast.error('QR-Code noch nicht bereit')
      return
    }
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = qrFileSlug
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function openQrOrLink() {
    if (qrDataUrl) {
      const w = window.open('', '_blank', 'noopener,noreferrer')
      if (w) {
        w.document.write(
          `<!doctype html><title>QR Melde-Link</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f7f6"><img src="${qrDataUrl}" alt="QR-Code" width="320" height="320" /></body>`
        )
        w.document.close()
        return
      }
    }
    window.open(meldeLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <MockCard title="Links" icon="link" className="objekte-links-card">
      <div className="objekte-links-card__row">
        <div className="objekte-links-card__label">Melde-Link</div>
        <div className="objekte-links-card__linkbox">
          <span className="objekte-links-card__url" title={meldeLink}>
            {meldeLink}
          </span>
          <MockBtn sm kind="ghost" icon="copy" title="Link kopieren" onClick={kopieren} />
          <a
            href={meldeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn ghost sm icon"
            aria-label="Link öffnen"
            title="Link öffnen"
          >
            <MockIcon ctx="btn" n="external-link" size={14} />
          </a>
        </div>
      </div>

      <div className="objekte-links-card__qr">
        <div className="objekte-links-card__label">{qrLabel}</div>
        {qrDataUrl ? (
          <button
            type="button"
            className="objekte-links-card__qr-btn"
            onClick={openQrOrLink}
            title="QR-Code öffnen"
            aria-label="QR-Code öffnen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR-Code ${qrLabel}`}
              width={140}
              height={140}
              className="objekte-links-card__qr-img"
            />
          </button>
        ) : (
          <div className="objekte-links-card__qr-placeholder">QR wird erzeugt…</div>
        )}
        <div className="objekte-links-card__qr-actions">
          <MockBtn sm kind="secondary" icon="external-link" disabled={!qrDataUrl} onClick={openQrOrLink}>
            Öffnen
          </MockBtn>
          <MockBtn sm kind="primary" icon="download" disabled={!qrDataUrl} onClick={downloadQr}>
            Download
          </MockBtn>
        </div>
      </div>

      {aushangPdfHref ? (
        <div className="objekte-links-card__aushang">
          <div className="objekte-links-card__label">Aushang</div>
          <a
            className="btn secondary sm"
            href={aushangPdfHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MockIcon ctx="btn" n="file-text" size={14} />
            Aushang PDF
          </a>
        </div>
      ) : null}
    </MockCard>
  )
}
