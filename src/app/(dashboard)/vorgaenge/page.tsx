import type { Metadata } from 'next'
import { Suspense } from 'react'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'

export const metadata: Metadata = {
  title: 'Vorgänge',
}

export const revalidate = 60

export default async function VorgaengePage() {
  const { rows, error } = await loadVorgaengeListe()

  if (error) {
    return (
      <div className="p-6 text-sm text-red-700">
        Vorgänge konnten nicht geladen werden: {error}
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-bw-text-muted">Laden…</div>}>
      <VorgaengeListeClient rows={rows} />
    </Suspense>
  )
}
