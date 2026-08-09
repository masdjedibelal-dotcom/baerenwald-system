'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnfrageWizard } from '@/components/anfragen/AnfrageWizard'

function NeueAnfrageWizardHost() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)
  const kundeId = searchParams.get('kunde_id')

  useEffect(() => {
    setOpen(true)
  }, [])

  function close() {
    setOpen(false)
    router.replace('/vorgaenge?tab=anfrage')
  }

  return (
    <>
      <div className="py-8 text-center text-sm text-bw-text-muted">Anfrage wird geöffnet…</div>
      <AnfrageWizard
        open={open}
        onClose={close}
        defaultKundeId={kundeId}
        onSuccess={(id) => {
          setOpen(false)
          router.replace(`/anfragen/${id}`)
        }}
      />
    </>
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
      <NeueAnfrageWizardHost />
    </Suspense>
  )
}
