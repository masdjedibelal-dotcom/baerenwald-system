'use client'

import { useEffect, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  orgMeldeLegalUrlsReady,
  ORG_MELDE_LEGAL_REQUIRED_HINT,
} from '@/lib/org/melde-legal-urls'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { toast } from '@/components/ui/app-toast'

/** Melde-Link + Kopieren; darunter QR-Download und Aushang-PDF — erst nach Legal-URLs. */
export function MeldeLinksCard({
  orgSlug,
  meldeSlug,
  aushangPdfHref,
  impressumUrl,
  datenschutzUrl,
  organisationHref,
}: {
  orgSlug: string
  meldeSlug?: string | null
  /** @deprecated Label entfällt — nur noch Download-Button */
  qrLabel?: string
  aushangPdfHref?: string | null
  impressumUrl?: string | null
  datenschutzUrl?: string | null
  /** Link zum Organisation-Tab, wenn Legal fehlt */
  organisationHref?: string | null
}) {
  const legalReady = orgMeldeLegalUrlsReady({
    impressum_url: impressumUrl,
    datenschutz_url: datenschutzUrl,
  })
  const meldeLink = buildMeldeLink(orgSlug, meldeSlug)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const qrFileSlug = meldeSlug?.trim()
    ? `melde-qr-${orgSlug}-${meldeSlug.trim().toLowerCase()}.png`
    : `melde-qr-${orgSlug}.png`

  useEffect(() => {
    if (!legalReady) {
      setQrDataUrl(null)
      return
    }
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
  }, [meldeLink, legalReady])

  function kopieren() {
    if (!legalReady) {
      toast.error(ORG_MELDE_LEGAL_REQUIRED_HINT)
      return
    }
    void navigator.clipboard.writeText(meldeLink).then(
      () => toast.success('Melde-Link kopiert'),
      () => toast.error('Kopieren fehlgeschlagen')
    )
  }

  function downloadQr() {
    if (!legalReady) {
      toast.error(ORG_MELDE_LEGAL_REQUIRED_HINT)
      return
    }
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
      {!legalReady ? (
        <p
          className="text-[12.5px] leading-relaxed"
          style={{ color: 'var(--text-3)', margin: '0 0 12px' }}
        >
          {ORG_MELDE_LEGAL_REQUIRED_HINT}
          {organisationHref ? (
            <>
              {' '}
              <a href={organisationHref} className="text-bw-link hover:underline">
                Organisation öffnen
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <div className="objekte-links-card__row">
          <div className="objekte-links-card__linkbox">
            <span className="objekte-links-card__url" title={meldeLink}>
              {meldeLink}
            </span>
            <MockBtn sm kind="ghost" icon="copy" title="Link kopieren" onClick={kopieren} />
          </div>
        </div>
      )}

      <div className="objekte-links-card__actions">
        <MockBtn
          sm
          kind="secondary"
          icon="download"
          disabled={!legalReady || !qrDataUrl}
          title={!legalReady ? ORG_MELDE_LEGAL_REQUIRED_HINT : undefined}
          onClick={downloadQr}
        >
          QR-Code
        </MockBtn>
        {aushangPdfHref ? (
          legalReady ? (
            <a
              className="btn secondary sm"
              href={aushangPdfHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MockIcon ctx="btn" n="file-text" size={14} />
              Aushang PDF
            </a>
          ) : (
            <span
              className="btn secondary sm"
              style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}
              title={ORG_MELDE_LEGAL_REQUIRED_HINT}
            >
              <MockIcon ctx="btn" n="file-text" size={14} />
              Aushang PDF
            </span>
          )
        ) : null}
      </div>
    </MockCard>
  )
}
