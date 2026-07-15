'use client'

import { useMemo } from 'react'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import type { AngebotDetail } from '@/lib/types'
import {
  CrmDokumenteTabelle,
  type CrmDokumentZeile,
} from '@/components/dokumente/CrmDokumenteTabelle'

function angebotPdfDateiname(detail: AngebotDetail): string {
  const nr = detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`
  return `Angebot_${nr.replace(/\s+/g, '_')}_Baerenwald.pdf`
}

export function anzahlAngebotAnhaenge(detail: AngebotDetail): number {
  return 1 + parseProjektFotos(detail.fotos_urls).length
}

export function AngebotAnhaengeTab({ detail }: { detail: AngebotDetail }) {
  const pdfHref = detail.pdf_url?.trim() || `/api/angebote/${detail.id}/pdf`
  const pdfName = angebotPdfDateiname(detail)
  const erstellt = detail.updated_at || detail.created_at

  const zeilen = useMemo((): CrmDokumentZeile[] => {
    const rows: CrmDokumentZeile[] = [
      {
        id: 'angebot-pdf',
        datum: erstellt,
        name: pdfName,
        href: pdfHref,
      },
    ]

    parseProjektFotos(detail.fotos_urls).forEach((foto, i) => {
      rows.push({
        id: `foto-${i}-${foto.url}`,
        name: foto.beschreibung?.trim() || `Foto ${i + 1}`,
        datum: erstellt,
        href: foto.url,
      })
    })
    return rows
  }, [detail.fotos_urls, erstellt, pdfHref, pdfName])

  return (
    <CrmDokumenteTabelle
      zeilen={zeilen}
      emptyDescription="Hier erscheint das Angebot als PDF, sobald es erstellt wurde."
    />
  )
}
