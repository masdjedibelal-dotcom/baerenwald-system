'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import { showRouteBusy, hideOverlayBusy } from '@/components/ui/action-busy'
import type { Kunde } from '@/lib/types'

export type FabVorgangArt = 'anfrage' | 'angebot' | 'rechnung'

/**
 * FAB-Zwischenschritt auf der aktuellen Seite (kein weißer `/neu`-Host).
 * Anfrage läuft über FabCreateHost → AnfrageWizard.
 * Angebot / Rechnung: KundePicker → direkt Wizard-URL (ohne Vorgang-Zwischenschritt).
 * Neu-Kunde: nach Speichern denselben Wizard-Pfad mit der neuen kunde_id.
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
  const [continuing, setContinuing] = useState(false)
  const continuingRef = useRef(false)

  useEffect(() => {
    if (!open || !art || art === 'anfrage') return
    if (continuingRef.current) return
    setCreateOpen(false)
    setContinuing(false)
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

  useEffect(() => {
    if (open) return
    continuingRef.current = false
    setContinuing(false)
    setCreateOpen(false)
  }, [open])

  if (!art || art === 'anfrage') return null

  function startAngebot(kid: string) {
    continuingRef.current = true
    setContinuing(true)
    setCreateOpen(false)
    hideOverlayBusy()
    showRouteBusy('Angebot wird geöffnet…')
    onClose()
    router.push(`/angebote/neu?kunde_id=${encodeURIComponent(kid)}`)
  }

  function startRechnung(kid: string) {
    continuingRef.current = true
    setContinuing(true)
    setCreateOpen(false)
    hideOverlayBusy()
    showRouteBusy('Rechnung wird geöffnet…')
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
  const showPicker = open && !createOpen && !continuing && !initialKundeId?.trim()

  return (
    <>
      <KundePickerSheet
        open={showPicker}
        onClose={() => {
          if (continuingRef.current) return
          onClose()
        }}
        title={pickerTitle}
        context="canvas"
        manageHistory={false}
        onNeu={() => setCreateOpen(true)}
        onPick={onKundePick}
      />

      <KundeModal
        open={createOpen && !continuing}
        onClose={() => {
          if (continuingRef.current) return
          setCreateOpen(false)
        }}
        stayOnPage
        context="canvas"
        manageHistory={false}
        onSaved={(id) => {
          if (!id) {
            setCreateOpen(false)
            return
          }
          if (art === 'angebot') startAngebot(id)
          else startRechnung(id)
        }}
      />
    </>
  )
}
