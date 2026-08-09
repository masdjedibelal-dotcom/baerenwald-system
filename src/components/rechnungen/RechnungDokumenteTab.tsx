'use client'

import { useMemo } from 'react'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import type { LeadDokumentRow, Rechnung } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

const COLS = 'minmax(0, 1fr) auto auto'

function pdfName(detail: Rechnung): string {
  const nr = detail.rechnungsnummer?.trim() || `RE-${detail.id.slice(0, 8).toUpperCase()}`
  return `Rechnung_${nr.replace(/\s+/g, '_')}_Baerenwald.pdf`
}

type RechnungKurz = {
  id: string
  created_at?: string | null
  rechnungsnummer?: string | null
  status?: string | null
  rechnungsdatum?: string | null
  gesendet_at?: string | null
  pdf_url?: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  beleg_typ?: string | null
}

/** Eine Dokumente-Liste: aktuelle RE + Geschwister + Uploads (kein zweiter „Dokumente“-Block). */
export function RechnungDokumenteTab({
  detail,
  leadId,
  dokumente = [],
  rechnungen = [],
  onReload,
}: {
  detail: Rechnung
  leadId?: string | null
  dokumente?: LeadDokumentRow[]
  rechnungen?: RechnungKurz[]
  onReload: () => void
}) {
  const pdfHref = detail.pdf_url?.trim() || `/api/rechnungen/${detail.id}/pdf`
  const name = pdfName(detail)
  const datum = detail.rechnungsdatum
    ? formatDatum(detail.rechnungsdatum)
    : detail.created_at
      ? formatDatum(detail.created_at.slice(0, 10))
      : '—'

  const alleRechnungen = useMemo((): RechnungKurz[] => {
    const extra = detail as Rechnung & {
      rechnung_art?: string | null
      abschlag_index?: number | null
    }
    const byId = new Map<string, RechnungKurz>()
    for (const r of rechnungen) byId.set(r.id, r)
    byId.set(detail.id, {
      id: detail.id,
      created_at: detail.created_at,
      rechnungsnummer: detail.rechnungsnummer,
      status: detail.status,
      rechnungsdatum: detail.rechnungsdatum,
      gesendet_at: detail.gesendet_at,
      pdf_url: detail.pdf_url,
      rechnung_art: extra.rechnung_art ?? null,
      abschlag_index: extra.abschlag_index ?? null,
      beleg_typ: detail.beleg_typ,
    })
    return Array.from(byId.values())
  }, [rechnungen, detail])

  if (leadId) {
    return (
      <AnfrageDokumenteTab
        leadId={leadId}
        dokumente={dokumente}
        angebote={[]}
        rechnungen={alleRechnungen}
        immerRechnungIds={[detail.id]}
        onReload={onReload}
      />
    )
  }

  return (
    <MockDokumenteCard>
      <div className="dok-list">
        <div className="list-row" style={{ gridTemplateColumns: COLS, cursor: 'default' }}>
          <div className="dok-list__main min-w-0">
            <div className="dok-list__name">
              <a href={pdfHref} target="_blank" rel="noopener noreferrer" className="hover:text-bw-link">
                {name}
              </a>
              <span className="dok-list__name-size">
                {' '}
                · Rechnungs-PDF{datum ? ` · ${datum}` : ''}
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
              title="Vorschau"
              onClick={() => window.open(pdfHref, '_blank')}
            />
            <a href={pdfHref} download className="btn ghost sm icon" title="Download">
              <MockIcon ctx="btn" n="download" size={14} />
            </a>
          </div>
        </div>
      </div>
    </MockDokumenteCard>
  )
}
