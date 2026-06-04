'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RedirectNeueAnfrage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams()
    const kundeId = searchParams.get('kunde_id')
    if (kundeId) params.set('kunde_id', kundeId)
    params.set('neu', '1')
    router.replace(`/anfragen?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
      Formular wird geöffnet…
    </div>
  )
}

export default function NeueAnfragePage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
          Lädt…
        </div>
      }
    >
      <RedirectNeueAnfrage />
    </Suspense>
  )
}
