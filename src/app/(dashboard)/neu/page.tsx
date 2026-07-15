'use client'

import { Suspense } from 'react'
import { NeuErstellenClient } from '@/components/neu/NeuErstellenClient'

export default function NeuPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Lädt…
        </div>
      }
    >
      <NeuErstellenClient />
    </Suspense>
  )
}
