'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import { toast } from '@/components/ui/app-toast'
import type { Kunde } from '@/lib/types'

/**
 * Schritt 1 für neues Angebot: Kunde per PickerSheet, dann DocumentCanvas-Wizard.
 * Wichtig: onClose nach erfolgreicher Wahl darf nicht zurück zur Liste navigieren
 * (KundePickerSheet ruft nach onPick immer onClose auf).
 */
export function AngebotNeuKundeGate({
  initialError,
}: {
  initialError?: string | null
} = {}) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const navigatingRef = useRef(false)

  useEffect(() => {
    if (initialError?.trim()) toast.error(initialError.trim())
  }, [initialError])

  function goWizard(kundeId: string) {
    navigatingRef.current = true
    setOpening(true)
    setPickerOpen(false)
    router.replace(`/angebote/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  function dismiss() {
    if (navigatingRef.current) return
    setPickerOpen(false)
    router.replace('/vorgaenge?tab=angebot')
  }

  return (
    <>
      <div className="py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
        {opening ? 'Angebot wird geöffnet…' : 'Kunde wählen…'}
      </div>
      <KundePickerSheet
        open={pickerOpen && !createOpen}
        onClose={dismiss}
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
