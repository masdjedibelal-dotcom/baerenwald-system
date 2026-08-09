'use client'

import { useState } from 'react'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import type { LeadDokumentRow, Rechnung } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

const COLS = '28px 1.6fr 1fr 120px 110px 70px'

function pdfName(detail: Rechnung): string {
  const nr = detail.rechnungsnummer?.trim() || `RE-${detail.id.slice(0, 8).toUpperCase()}`
  return `Rechnung_${nr.replace(/\s+/g, '_')}_Baerenwald.pdf`
}

export function RechnungDokumenteTab({
  detail,
  leadId,
  dokumente = [],
  onReload,
}: {
  detail: Rechnung
  leadId?: string | null
  dokumente?: LeadDokumentRow[]
  onReload: () => void
}) {
  const [preview, setPreview] = useState(false)
  const pdfHref = detail.pdf_url?.trim() || `/api/rechnungen/${detail.id}/pdf`
  const name = pdfName(detail)
  const datum = detail.rechnungsdatum
    ? formatDatum(detail.rechnungsdatum)
    : detail.created_at
      ? formatDatum(detail.created_at.slice(0, 10))
      : '—'

  return (
    <>
      <MockDokumenteCard>
        <div className="dok-list">
          <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
            <div />
            <div>Name</div>
            <div>Beschreibung</div>
            <div>Datum</div>
            <div>Freigabe</div>
            <div />
          </div>
          <div className="list-row" style={{ gridTemplateColumns: COLS, cursor: 'default' }}>
            <MockIcon ctx="row" n="file-text" size={18} />
            <div className="min-w-0 truncate text-[13px] font-medium text-bw-text">
              <a href={pdfHref} target="_blank" rel="noopener noreferrer" className="hover:text-bw-link">
                {name}
              </a>
            </div>
            <div className="min-w-0 truncate text-[12.5px] text-bw-text-muted">Rechnungs-PDF</div>
            <div className="whitespace-nowrap text-[12px] tabular-nums text-bw-text-muted">{datum}</div>
            <div className="text-[12px] text-bw-text-muted">—</div>
            <div className="flex justify-end gap-1">
              <MockBtn
                sm
                kind="ghost"
                icon="eye"
                title="Vorschau"
                onClick={() => setPreview(true)}
              />
              <a href={pdfHref} download className="btn ghost sm icon" title="Download">
                <MockIcon ctx="btn" n="download" size={14} />
              </a>
            </div>
          </div>
        </div>
      </MockDokumenteCard>

      {leadId ? (
        <AnfrageDokumenteTab
          leadId={leadId}
          dokumente={dokumente}
          angebote={[]}
          onReload={onReload}
        />
      ) : null}

      <MockModal
        open={preview}
        onClose={() => setPreview(false)}
        icon="file-text"
        title={name}
        sub="Rechnungs-PDF"
        footer={
          <MockBtn kind="primary" icon="external-link" onClick={() => window.open(pdfHref, '_blank')}>
            In neuem Tab öffnen
          </MockBtn>
        }
      >
        <iframe title={name} src={pdfHref} style={{ width: '100%', height: 420, border: 0, borderRadius: 8 }} />
      </MockModal>
    </>
  )
}
