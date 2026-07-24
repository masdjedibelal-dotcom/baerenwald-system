'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { NeuErstellenClient } from '@/components/neu/NeuErstellenClient'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

const VORGANG_ARTS = new Set<FabVorgangArt>(['anfrage', 'angebot', 'rechnung'])

function isFabArt(v: string | null): v is FabVorgangArt {
  return v != null && VORGANG_ARTS.has(v as FabVorgangArt)
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

  if (artParam === 'anfrage' || artParam === 'angebot') {
    return (
      <div className="py-8 text-center text-sm text-bw-text-muted">
        {artParam === 'anfrage' ? 'Anfrage' : 'Angebot'} wird geöffnet…
      </div>
    )
  }

  if (isFabArt(artParam) || art) {
    return (
      <>
        <div className="py-8 text-center text-sm text-bw-text-muted">Vorgang wird vorbereitet…</div>
        <FabVorgangStartModal
          open={art != null}
          art={art}
          initialKundeId={kundeIdParam}
          onClose={() => {
            setArt(null)
            router.replace('/vorgaenge')
          }}
        />
      </>
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
