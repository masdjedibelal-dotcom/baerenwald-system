'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { NeuErstellenClient } from '@/components/neu/NeuErstellenClient'

const VORGANG_ARTS = new Set<FabVorgangArt>(['anfrage', 'angebot', 'auftrag', 'rechnung'])

function isFabArt(v: string | null): v is FabVorgangArt {
  return v != null && VORGANG_ARTS.has(v as FabVorgangArt)
}

function NeuVorgangHost() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artParam = searchParams.get('art')
  const kundeIdParam = searchParams.get('kunde_id')
  const [art, setArt] = useState<FabVorgangArt | null>(
    isFabArt(artParam) ? artParam : null
  )

  useEffect(() => {
    if (isFabArt(artParam)) setArt(artParam)
  }, [artParam])

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

  return <NeuErstellenClient />
}

export default function NeuPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Lädt…
        </div>
      }
    >
      <NeuVorgangHost />
    </Suspense>
  )
}
