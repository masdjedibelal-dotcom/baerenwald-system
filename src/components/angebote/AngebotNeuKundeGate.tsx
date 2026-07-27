'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import type { Kunde } from '@/lib/types'

/**
 * Schritt 1 für neues Angebot: Kunde per PickerSheet, dann Wizard.
 */
export function AngebotNeuKundeGate() {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  function goWizard(kundeId: string) {
    router.replace(`/angebote/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  return (
    <>
      <div className="py-8 text-center text-sm text-bw-text-muted">Kunde wählen…</div>
      <KundePickerSheet
        open={pickerOpen && !createOpen}
        onClose={() => {
          setPickerOpen(false)
          router.replace('/vorgaenge?tab=angebot')
        }}
        title="Angebot"
        context="canvas"
        onNeu={() => setCreateOpen(true)}
        onPick={(k: Kunde) => goWizard(k.id)}
      />
      <KundeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stayOnPage
        onSaved={(id) => {
          setCreateOpen(false)
          if (id) goWizard(id)
        }}
      />
    </>
  )
}
