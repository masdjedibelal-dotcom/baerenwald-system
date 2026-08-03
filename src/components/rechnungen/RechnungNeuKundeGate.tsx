'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentCanvas, DocumentSection } from '@/components/surfaces/DocumentCanvas'
import { DashedAddCard } from '@/components/surfaces/primitives'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import { toast } from '@/components/ui/app-toast'
import { showRouteBusy } from '@/components/ui/action-busy'
import type { Kunde } from '@/lib/types'

/**
 * Deep-Link `/rechnungen/neu` ohne kunde_id — Fullscreen-Canvas + Kunden-Picker (Mock `.doccv`).
 * FAB öffnet den Picker über FabCreateHost; nach Wahl → Wizard mit kunde_id.
 */
export function RechnungNeuKundeGate({
  initialError,
}: {
  initialError?: string | null
} = {}) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const openingRef = useRef(false)

  useEffect(() => {
    if (initialError?.trim()) toast.error(initialError.trim())
  }, [initialError])

  function goWizard(kundeId: string) {
    openingRef.current = true
    setOpening(true)
    setPickerOpen(false)
    showRouteBusy('Rechnung wird geöffnet…')
    router.replace(`/rechnungen/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  function dismiss() {
    if (openingRef.current || opening) return
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.replace('/vorgaenge?tab=rechnung')
  }

  return (
    <>
      <DocumentCanvas
        title="Rechnung erstellen"
        onClose={dismiss}
        portal
        manageHistory={false}
        className="wizard-flow rechnung-neu-gate"
      >
        <DocumentSection label="Kunde">
          <DashedAddCard
            label={opening ? 'Rechnung wird geöffnet…' : 'Kunde wählen'}
            onClick={() => {
              if (opening) return
              setPickerOpen(true)
            }}
          />
        </DocumentSection>
        <DocumentSection label="Kopf">
          <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
            Nr. · Datum · Fällig
          </p>
        </DocumentSection>
        <DocumentSection label="Positionen">
          <DashedAddCard
            label="Position hinzufügen"
            onClick={() => {
              if (opening) return
              setPickerOpen(true)
            }}
          />
        </DocumentSection>
      </DocumentCanvas>

      <KundePickerSheet
        open={pickerOpen && !createOpen && !opening}
        onClose={() => {
          setPickerOpen(false)
          dismiss()
        }}
        title="Rechnung"
        context="canvas"
        manageHistory={false}
        onNeu={() => setCreateOpen(true)}
        onPick={(k: Kunde) => goWizard(k.id)}
      />
      <KundeModal
        open={createOpen && !opening}
        onClose={() => {
          if (openingRef.current) return
          setCreateOpen(false)
        }}
        stayOnPage
        context="canvas"
        manageHistory={false}
        onSaved={(id) => {
          if (id) goWizard(id)
          else setCreateOpen(false)
        }}
      />
    </>
  )
}
