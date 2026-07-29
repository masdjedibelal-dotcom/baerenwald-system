'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { NeuErstellenClient } from '@/components/neu/NeuErstellenClient'
import { KundeModal } from '@/components/kunden/KundeModal'
import { PartnerCreateSheet } from '@/components/handwerker/PartnerCreateSheet'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

const VORGANG_ARTS = new Set<FabVorgangArt>(['anfrage', 'angebot', 'rechnung'])

function isFabArt(v: string | null): v is FabVorgangArt {
  return v != null && VORGANG_ARTS.has(v as FabVorgangArt)
}

/** Deep-Link-Abbruch: zurück zur vorherigen Seite, sonst sensible Liste. */
function closeDeepLink(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.replace(fallback)
}

function NeuVorgangHost({
  gewerkeOptionen,
}: {
  gewerkeOptionen: { id: string; name: string; slug: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artParam = searchParams.get('art')
  const kundeIdParam = searchParams.get('kunde_id')
  const [art, setArt] = useState<FabVorgangArt | null>(
    isFabArt(artParam) && artParam !== 'anfrage' && artParam !== 'angebot' ? artParam : null
  )
  const [kundeSheetOpen, setKundeSheetOpen] = useState(artParam === 'kunde')
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(
    artParam === 'handwerker' || artParam === 'partner'
  )

  // Anfrage / Angebot: Kunde im Ziel-Flow (Funnel / Gate)
  useEffect(() => {
    if (artParam !== 'anfrage' && artParam !== 'angebot') return
    const kid = kundeIdParam?.trim()
    if (artParam === 'anfrage') {
      router.replace(kid ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}` : '/anfragen/neu')
      return
    }
    router.replace(kid ? `/angebote/neu?kunde_id=${encodeURIComponent(kid)}` : '/angebote/neu')
  }, [artParam, kundeIdParam, router])

  useEffect(() => {
    if (isFabArt(artParam) && artParam !== 'anfrage' && artParam !== 'angebot') setArt(artParam)
  }, [artParam])

  useEffect(() => {
    setKundeSheetOpen(artParam === 'kunde')
    setPartnerSheetOpen(artParam === 'handwerker' || artParam === 'partner')
  }, [artParam])

  if (artParam === 'anfrage' || artParam === 'angebot') {
    return <CrmInlineLoading label="Wird geöffnet …" />
  }

  if (artParam === 'kunde') {
    return (
      <KundeModal
        open={kundeSheetOpen}
        onClose={() => {
          setKundeSheetOpen(false)
          closeDeepLink(router, '/kunden')
        }}
      />
    )
  }

  if (artParam === 'handwerker' || artParam === 'partner') {
    return (
      <PartnerCreateSheet
        open={partnerSheetOpen}
        gewerkeOptionen={gewerkeOptionen}
        onClose={() => {
          setPartnerSheetOpen(false)
          closeDeepLink(router, '/handwerker')
        }}
      />
    )
  }

  if (isFabArt(artParam) || art) {
    return (
      <FabVorgangStartModal
        open={art != null}
        art={art}
        initialKundeId={kundeIdParam}
        onClose={() => {
          setArt(null)
          closeDeepLink(router, '/vorgaenge')
        }}
      />
    )
  }

  return <NeuErstellenClient gewerkeOptionen={gewerkeOptionen} />
}

export function NeuPageClient({
  gewerkeOptionen,
}: {
  gewerkeOptionen: { id: string; name: string; slug: string }[]
}) {
  return (
    <Suspense fallback={<CrmInlineLoading label="Wird geladen …" />}>
      <NeuVorgangHost gewerkeOptionen={gewerkeOptionen} />
    </Suspense>
  )
}
