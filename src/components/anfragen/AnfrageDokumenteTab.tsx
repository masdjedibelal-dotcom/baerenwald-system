'use client'

import { useMemo } from 'react'
import {
  CrmDokumenteTabelle,
  type CrmDokumentZeile,
} from '@/components/dokumente/CrmDokumenteTabelle'

type AngebotKurz = {
  id: string
  created_at: string
  angebotsnr?: string | null
  pdf_url?: string | null
}

export function AnfrageDokumenteTab({
  angebote,
}: {
  angebote: AngebotKurz[]
}) {
  const zeilen = useMemo((): CrmDokumentZeile[] => {
    return angebote.map((a) => ({
      id: `angebot-${a.id}`,
      datum: a.created_at,
      name: a.angebotsnr?.trim()
        ? `Angebot ${a.angebotsnr.trim()}`
        : `Angebot ${a.id.slice(0, 8).toUpperCase()}`,
      href: a.pdf_url?.trim() || `/api/angebote/${a.id}/pdf`,
    }))
  }, [angebote])

  return (
    <CrmDokumenteTabelle
      zeilen={zeilen}
      emptyDescription="Sobald Angebote erstellt wurden, erscheinen die PDFs hier."
    />
  )
}
