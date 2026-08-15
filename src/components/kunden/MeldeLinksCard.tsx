'use client'

import { useEffect, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { toast } from '@/components/ui/app-toast'

/** Melde-Link + Kopieren; darunter QR-Download und Aushang-PDF. */
export function MeldeLinksCard({
  orgSlug,
  meldeSlug,
  aushangPdfHref,
}: {
  orgSlug: string
  meldeSlug?: string | null
  /** @deprecated Label entfällt — nur noch Download-Button */
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

  return (
    <MockCard title="Links" icon="link" className="objekte-links-card">
      <div className="objekte-links-card__row">
        <div className="objekte-links-card__linkbox">
          <span className="objekte-links-card__url" title={meldeLink}>
            {meldeLink}
          </span>
          <MockBtn sm kind="ghost" icon="copy" title="Link kopieren" onClick={kopieren} />
        </div>
      </div>

      <div className="objekte-links-card__actions">
        <MockBtn
          sm
          kind="secondary"
          icon="download"
          disabled={!qrDataUrl}
          onClick={downloadQr}
        >
          QR-Code
        </MockBtn>
        {aushangPdfHref ? (
          <a
            className="btn secondary sm"
            href={aushangPdfHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MockIcon ctx="btn" n="file-text" size={14} />
            Aushang PDF
          </a>
        ) : null}
      </div>
    </MockCard>
  )
}
