'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { AnfrageNeuForm } from '@/components/anfragen/AnfrageNeuForm'

function NeueAnfrageInhalt() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kundeId = searchParams.get('kunde_id')

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader
        title="Neue Anfrage"
        breadcrumbs={[
          { label: 'Anfragen', href: '/anfragen' },
          { label: 'Neue Anfrage' },
        ]}
      />
      <div className="mt-6">
        <AnfrageNeuForm
          defaultKundeId={kundeId}
          onSuccess={(id) => {
            router.push(`/anfragen/${id}`)
            router.refresh()
          }}
        />
      </div>
    </div>
  )
}

export default function NeueAnfragePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-sm text-bw-text-muted">Lädt…</p>
        </div>
      }
    >
      <NeueAnfrageInhalt />
    </Suspense>
  )
}
