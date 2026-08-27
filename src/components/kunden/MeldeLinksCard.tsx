'use client'

import { useEffect, useState } from 'react'
import { saveKundeMeldeLegalUrls } from '@/app/actions/kunden-organisation'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  normalizeOrgHttpUrl,
  orgMeldeLegalUrlsReady,
  ORG_MELDE_LEGAL_REQUIRED_HINT,
} from '@/lib/org/melde-legal-urls'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { toast } from '@/components/ui/app-toast'

/**
 * Legal-URLs (Impressum/Datenschutz) inline bearbeiten + Melde-Link / QR / Aushang.
 * Kein Sprung zum alten Organisation-Tab.
 */
export function MeldeLinksCard({
  kundeId,
  orgSlug,
  meldeSlug,
  aushangPdfHref,
  impressumUrl,
  datenschutzUrl,
  onSaved,
}: {
  kundeId: string
  orgSlug: string
  meldeSlug?: string | null
  /** @deprecated Label entfällt — nur noch Download-Button */
  qrLabel?: string
  aushangPdfHref?: string | null
  impressumUrl?: string | null
  datenschutzUrl?: string | null
  onSaved?: (next: {
    impressum_url: string | null
    datenschutz_url: string | null
  }) => void
}) {
  const [impressum, setImpressum] = useState(impressumUrl?.trim() ?? '')
  const [datenschutz, setDatenschutz] = useState(datenschutzUrl?.trim() ?? '')
  const [savedImpressum, setSavedImpressum] = useState(impressumUrl ?? null)
  const [savedDatenschutz, setSavedDatenschutz] = useState(datenschutzUrl ?? null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setImpressum(impressumUrl?.trim() ?? '')
    setDatenschutz(datenschutzUrl?.trim() ?? '')
    setSavedImpressum(impressumUrl ?? null)
    setSavedDatenschutz(datenschutzUrl ?? null)
    setErr(null)
  }, [impressumUrl, datenschutzUrl, kundeId])

  const legalReady = orgMeldeLegalUrlsReady({
    impressum_url: savedImpressum,
    datenschutz_url: savedDatenschutz,
  })
  const dirty =
    (normalizeOrgHttpUrl(impressum) ?? '') !==
      (normalizeOrgHttpUrl(savedImpressum) ?? '') ||
    (normalizeOrgHttpUrl(datenschutz) ?? '') !==
      (normalizeOrgHttpUrl(savedDatenschutz) ?? '')

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

  async function speichern() {
    setErr(null)
    setSaving(true)
    try {
      const res = await saveKundeMeldeLegalUrls(kundeId, {
        impressum_url: impressum,
        datenschutz_url: datenschutz,
      })
      if (!res.ok) {
        setErr(res.message)
        toast.error(res.message)
        return
      }
      setSavedImpressum(res.impressum_url)
      setSavedDatenschutz(res.datenschutz_url)
      setImpressum(res.impressum_url ?? '')
      setDatenschutz(res.datenschutz_url ?? '')
      onSaved?.({
        impressum_url: res.impressum_url,
        datenschutz_url: res.datenschutz_url,
      })
      toast.success('Links gespeichert')
    } finally {
      setSaving(false)
    }
  }

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
      <div className="space-y-3" style={{ marginBottom: 12 }}>
        <MockField label="Impressum-URL (Mieter)" required full>
          <input
            className="input"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="www.ihre-verwaltung.de/impressum"
            value={impressum}
            onChange={(e) => {
              setImpressum(e.target.value)
              setErr(null)
            }}
          />
        </MockField>
        <MockField label="Datenschutz-URL (Mieter)" required full>
          <input
            className="input"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="www.ihre-verwaltung.de/datenschutz"
            value={datenschutz}
            onChange={(e) => {
              setDatenschutz(e.target.value)
              setErr(null)
            }}
          />
        </MockField>
        {err ? (
          <p className="text-[12px] font-semibold text-red-700" role="alert">
            {err}
          </p>
        ) : !legalReady ? (
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-3)', margin: 0 }}>
            Beide Links speichern — danach sind Melde-Link, QR und Aushang verfügbar.
          </p>
        ) : null}
        <div className="flex justify-end">
          <MockBtn
            sm
            kind="primary"
            disabled={saving || !dirty}
            onClick={() => void speichern()}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </MockBtn>
        </div>
      </div>

      {legalReady ? (
        <div className="objekte-links-card__row">
          <div className="objekte-links-card__linkbox">
            <span className="objekte-links-card__url" title={meldeLink}>
              {meldeLink}
            </span>
            <MockBtn sm kind="ghost" icon="copy" title="Link kopieren" onClick={kopieren} />
          </div>
        </div>
      ) : null}

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
