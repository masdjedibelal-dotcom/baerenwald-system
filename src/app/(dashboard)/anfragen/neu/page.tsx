'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnfrageWizard } from '@/components/anfragen/AnfrageWizard'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

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
    // Deep-Link-Host: zurück wenn möglich, sonst Vorgänge
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.replace('/vorgaenge?tab=anfrage')
  }

  return (
    <>
      <div className="py-8">
        <CrmInlineLoading label="Anfrage wird geöffnet …" minHeight={80} />
      </div>
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
    <Suspense fallback={<CrmInlineLoading label="Neue Anfrage wird geladen …" />}>
      <NeueAnfrageWizardHost />
    </Suspense>
  )
}
