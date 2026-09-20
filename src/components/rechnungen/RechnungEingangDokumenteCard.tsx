'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { useState } from 'react'
import { signPartnerDokumentUrl } from '@/app/(dashboard)/handwerker/actions'
import { toast } from '@/components/ui/app-toast'
import type { Rechnung } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

const COLS = 'minmax(0, 1fr) auto auto'

/**
 * Akte einer Eingangsrechnung: nur das Handwerker-Rechnungs-PDF (signiert öffnen).
 */
export function RechnungEingangDokumenteCard({ detail }: { detail: Rechnung }) {
  const [busy, setBusy] = useState(false)
  const nr = detail.rechnungsnummer?.trim() || `ER-${detail.id.slice(0, 8).toUpperCase()}`
  const label = `Partner-Rechnung ${nr}`
  const datum = detail.rechnungsdatum
    ? formatDatum(detail.rechnungsdatum)
    : detail.gesendet_at
      ? formatDatum(detail.gesendet_at.slice(0, 10))
      : detail.created_at
        ? formatDatum(detail.created_at.slice(0, 10))
        : null
  const stored = detail.pdf_url?.trim() || ''

  async function openPdf() {
    if (!stored) {
      toast.error(TOAST.kein_rechnungs_pdf_hinterlegt)
      return
    }
    setBusy(true)
    try {
      const r = await signPartnerDokumentUrl(stored)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      window.open(r.url, '_blank', 'noopener,noreferrer')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MockDokumenteCard count={stored ? 1 : 0}>
      {stored ? (
        <div className="dok-list">
          <div className="list-row" style={{ gridTemplateColumns: COLS, cursor: 'default' }}>
            <div className="dok-list__main min-w-0">
              <div className="dok-list__name">
                <MockBtn className="hover:text-bw-link text-left" type="button" disabled={busy} onClick={() => void openPdf()}>
                  {label}
                </MockBtn>
                <span className="dok-list__name-size">
                  {' '}
                  · Partner-PDF{datum ? ` · ${datum}` : ''}
                </span>
              </div>
            </div>
            <span className="dok-list__freigabe">
              <span>—</span>
            </span>
            <div className="dok-list__actions">
              <MockBtn
                sm
                kind="ghost"
                icon="eye"
                title={busy ? 'Lädt…' : 'Öffnen'}
                disabled={busy}
                onClick={() => void openPdf()}
              />
              <MockBtn
                sm
                kind="ghost"
                icon="download"
                title="Öffnen / speichern"
                disabled={busy}
                onClick={() => void openPdf()}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '0.25rem 0' }}>
          Kein Partner-PDF hinterlegt.
        </div>
      )}
    </MockDokumenteCard>
  )
}
