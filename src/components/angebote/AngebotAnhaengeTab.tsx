'use client'

import { useMemo, useState } from 'react'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import type { AngebotDetail, LeadDokumentRow } from '@/lib/types'

const COLS = 'minmax(0, 1fr) auto auto'

type DocRow = {
  id: string
  name: string
  href: string
  created_at: string
  beschreibung: string
  isImage: boolean
}

function formatDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function angebotPdfDateiname(detail: AngebotDetail): string {
  const nr = detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`
  return `Angebot_${nr.replace(/\s+/g, '_')}_Baerenwald.pdf`
}

function isImageDoc(name: string, url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(`${name} ${url}`)
}

/** Badge-Zähler: Lead-Uploads + Angebot-PDF (+ Projektfotos nur ohne Lead-Upload-UI) + Rechnungen. */
export function anzahlAngebotAnhaenge(
  detail: AngebotDetail,
  leadDokumente?: LeadDokumentRow[] | null,
  opts?: { includeFotos?: boolean; rechnungenCount?: number }
): number {
  const uploads = Array.isArray(leadDokumente) ? leadDokumente.length : 0
  const fotos =
    opts?.includeFotos === false ? 0 : parseProjektFotos(detail.fotos_urls).length
  return uploads + 1 + fotos + (opts?.rechnungenCount ?? 0)
}

/**
 * Dokumente-Tab wie Anfrage: bei Lead → AnfrageDokumenteTab (Upload + PDF),
 * sonst MockDokumenteCard mit PDF + Projektfotos.
 */
export function AngebotAnhaengeTab({
  detail,
  leadId,
  dokumente = [],
  rechnungen = [],
  onReload,
}: {
  detail: AngebotDetail
  leadId?: string | null
  dokumente?: LeadDokumentRow[]
  rechnungen?: {
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
  }[]
  onReload?: () => void
}) {
  if (leadId?.trim() && onReload) {
    return (
      <AnfrageDokumenteTab
        leadId={leadId}
        dokumente={dokumente}
        angebote={[
          {
            id: detail.id,
            created_at: detail.created_at,
            angebotsnr: detail.angebotsnr,
            pdf_url: detail.pdf_url,
          },
        ]}
        rechnungen={rechnungen}
        onReload={onReload}
      />
    )
  }

  return <AngebotDokumenteFallback detail={detail} />
}

function AngebotDokumenteFallback({ detail }: { detail: AngebotDetail }) {
  const [view, setView] = useState<DocRow | null>(null)
  const erstellt = detail.updated_at || detail.created_at
  const pdfHref = detail.pdf_url?.trim() || `/api/angebote/${detail.id}/pdf`

  const docs = useMemo((): DocRow[] => {
    const rows: DocRow[] = [
      {
        id: 'angebot-pdf',
        name: angebotPdfDateiname(detail),
        href: pdfHref,
        created_at: erstellt,
        beschreibung: 'Angebot PDF',
        isImage: false,
      },
    ]
    parseProjektFotos(detail.fotos_urls).forEach((foto, i) => {
      const name = foto.beschreibung?.trim() || `Foto ${i + 1}`
      rows.push({
        id: `foto-${i}`,
        name,
        href: foto.url,
        created_at: erstellt,
        beschreibung: foto.beschreibung?.trim() || '',
        isImage: isImageDoc(name, foto.url),
      })
    })
    return rows
  }, [detail, erstellt, pdfHref])

  return (
    <>
      <MockDokumenteCard count={docs.length} empty={docs.length === 0}>
        {docs.length === 0 ? null : (
          <div className="dok-list">
            {docs.map((d) => {
              const meta = [d.beschreibung || null, formatDatum(d.created_at)]
                .filter(Boolean)
                .join(' · ')
              return (
                <div
                  key={d.id}
                  className="list-row dok-list__row--openable"
                  style={{ gridTemplateColumns: COLS, cursor: 'pointer', alignItems: 'center' }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setView(d)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setView(d)
                    }
                  }}
                >
                  <div className="dok-list__main min-w-0">
                    <div className="dok-list__name">
                      {d.name}
                      {meta ? <span className="dok-list__name-size"> · {meta}</span> : null}
                    </div>
                  </div>
                  <span className="dok-list__freigabe">
                    <span>intern</span>
                  </span>
                  <div className="dok-list__actions" onClick={(e) => e.stopPropagation()}>
                    <MockBtn sm kind="ghost" icon="eye" title="Ansehen" onClick={() => setView(d)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockDokumenteCard>

      <MockModal
        open={!!view}
        onClose={() => setView(null)}
        icon={view?.isImage ? 'photo' : 'file-text'}
        title={view?.name ?? 'Dokument'}
        sub={view ? formatDatum(view.created_at) : undefined}
        footer={
          <MockBtn sm kind="primary" icon="x" onClick={() => setView(null)}>
            Schließen
          </MockBtn>
        }
      >
        {view ? (
          view.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.href}
              alt={view.name}
              style={{ width: '100%', borderRadius: 8, display: 'block' }}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                background: 'var(--bg-soft)',
                borderRadius: 10,
                border: '0.5px solid var(--border)',
              }}
            >
              <MockIcon
                ctx="empty"
                n="file-text"
                size={44}
                style={{ color: 'var(--text-4)' }}
              />
              <div style={{ fontSize: 'var(--fs-text)', fontWeight: 500, marginTop: 10 }}>{view.name}</div>
              <a
                href={view.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost sm"
                style={{ marginTop: 12, display: 'inline-flex' }}
              >
                Datei öffnen
              </a>
            </div>
          )
        ) : null}
      </MockModal>
    </>
  )
}
