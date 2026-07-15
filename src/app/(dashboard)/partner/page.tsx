import { Suspense } from 'react'
import { PartnerNetzwerkClient } from '@/components/partner/PartnerNetzwerkClient'
import { loadPartnerListe } from '@/lib/partner/load-partner-liste'

export default async function PartnerPage() {
  const { partners, kategorien } = await loadPartnerListe()

  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Partner werden geladen…
        </div>
      }
    >
      <PartnerNetzwerkClient partners={partners} kategorien={kategorien} mode="page" />
    </Suspense>
  )
}
