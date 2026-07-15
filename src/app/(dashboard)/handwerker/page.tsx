import { Suspense } from 'react'
import { HandwerkerListeClient } from '@/components/handwerker/HandwerkerListeClient'
import { loadHandwerkerListe } from '@/lib/handwerker/load-handwerker-liste'

export default async function HandwerkerPage() {
  const { rows, gewerkeOptionen } = await loadHandwerkerListe()

  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Handwerker werden geladen…
        </div>
      }
    >
      <HandwerkerListeClient rows={rows} gewerkeOptionen={gewerkeOptionen} mode="page" />
    </Suspense>
  )
}
