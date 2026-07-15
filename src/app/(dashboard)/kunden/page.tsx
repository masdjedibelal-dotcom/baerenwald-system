import { Suspense } from 'react'
import { KundenListeClient } from '@/components/kunden/KundenListeClient'
import { loadKundenListe } from '@/lib/kunden/kunden-liste-data'

export default async function KundenPage() {
  const kunden = await loadKundenListe()

  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Kunden werden geladen…
        </div>
      }
    >
      <KundenListeClient kunden={kunden} mode="page" />
    </Suspense>
  )
}
