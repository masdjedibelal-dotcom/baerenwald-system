'use client'

import { useMemo } from 'react'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import type { AngebotDetail, LeadDokumentRow } from '@/lib/types'
import { useIsMobile } from '@/hooks/useIsMobile'

const COLS = 'minmax(0, 1fr) auto auto'

type DocRow = {
  id: string
  name: string
  href: string
  created_at: string
  beschreibung: string
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

function openDokumentDatei(url: string) {
  const href = url.trim()
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
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

/**
 * Badge-Zähler für den Dokumente-Tab (Upload + Angebot-PDF + optional Fotos/Rechnungen).
 */
export function anzahlAngebotAnhaenge(
  detail: AngebotDetail,
  dokumente: LeadDokumentRow[],
  opts?: { includeFotos?: boolean; rechnungenCount?: number }
): number {
  const rechnungenCount = opts?.rechnungenCount ?? 0
  if (opts?.includeFotos) {
    return 1 + parseProjektFotos(detail.fotos_urls).length + rechnungenCount
  }
  return dokumente.length + 1 + rechnungenCount
}

/**
 * Angebot → Dokumente: gleiche Liste wie Anfrage (Lead-Uploads + Angebote + Rechnungen).
 * Fallback ohne Lead: PDF + Projektfotos.
 */
export function AngebotAnhaengeTab({
  detail,
  leadId: leadIdProp = null,
  dokumente = [],
  rechnungen = [],
  onReload,
}: {
  detail: AngebotDetail
  leadId?: string | null
  dokumente?: LeadDokumentRow[]
  rechnungen?: RechnungKurz[]
  onReload: () => void
}) {
  const leadId = leadIdProp?.trim() || detail.lead_id?.trim() || null

  if (leadId) {
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
  const isMobile = useIsMobile()
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
      })
    })
    return rows
  }, [detail, erstellt, pdfHref])

  return (
    <MockDokumenteCard count={docs.length} empty={docs.length === 0}>
      {docs.length === 0 ? null : isMobile ? (
        <div className="dok-cards">
          {docs.map((d) => {
            const meta = [d.beschreibung || null, formatDatum(d.created_at)]
              .filter(Boolean)
              .join(' · ')
            return (
              <DokMobileCard
                key={d.id}
                title={d.name}
                meta={meta}
                onClick={() => openDokumentDatei(d.href)}
                badge={<span className="dok-card__tag">intern</span>}
              />
            )
          })}
        </div>
      ) : (
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
                onClick={() => openDokumentDatei(d.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDokumentDatei(d.href)
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
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="eye"
                    title="Ansehen"
                    onClick={() => openDokumentDatei(d.href)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MockDokumenteCard>
  )
}
