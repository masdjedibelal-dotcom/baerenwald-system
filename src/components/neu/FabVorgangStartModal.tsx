'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import type { Kunde } from '@/lib/types'

export type FabVorgangArt = 'anfrage' | 'angebot' | 'rechnung'

/**
 * FAB-Zwischenschritt auf der aktuellen Seite (kein weißer `/neu`-Host).
 * Anfrage läuft über FabCreateHost → AnfrageWizard.
 * Angebot / Rechnung: KundePicker → direkt Wizard-URL (ohne Vorgang-Zwischenschritt).
 */
export function FabVorgangStartModal({
  open,
  art,
  onClose,
  initialKundeId,
}: {
  open: boolean
  art: FabVorgangArt | null
  onClose: () => void
  initialKundeId?: string | null
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!open || !art || art === 'anfrage') return
    setCreateOpen(false)
    const kid = initialKundeId?.trim()
    if (art === 'rechnung' && kid) {
      startRechnung(kid)
      return
    }
    if (art === 'angebot' && kid) {
      startAngebot(kid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei open/art/kunde
  }, [open, art, initialKundeId])

  if (!art || art === 'anfrage') return null

  function startAngebot(kid: string) {
    onClose()
    router.push(`/angebote/neu?kunde_id=${encodeURIComponent(kid)}`)
  }

  function startRechnung(kid: string) {
    onClose()
    router.push(`/rechnungen/neu?kunde_id=${encodeURIComponent(kid)}`)
  }

  function onKundePick(k: Kunde) {
    if (art === 'angebot') {
      startAngebot(k.id)
      return
    }
    startRechnung(k.id)
  }

  const pickerTitle = art === 'angebot' ? 'Angebot' : 'Rechnung'
  const showPicker = open && !createOpen && !initialKundeId?.trim()

  return (
    <>
      <KundePickerSheet
        open={showPicker}
        onClose={onClose}
        title={pickerTitle}
        context="canvas"
        manageHistory={false}
        onNeu={() => setCreateOpen(true)}
        onPick={onKundePick}
      />

      <KundeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stayOnPage
        onSaved={(id) => {
          setCreateOpen(false)
          if (!id) return
          if (art === 'angebot') startAngebot(id)
          else startRechnung(id)
        }}
      />
    </>
  )
}
