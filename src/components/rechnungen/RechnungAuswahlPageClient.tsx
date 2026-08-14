'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RechnungAuswahlModal } from '@/components/rechnungen/RechnungAuswahlModal'
import type { RechnungAuswahlZeile } from '@/components/rechnungen/RechnungAuswahlPanel'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import { loadRechnungWizardBootstrapFromAuftrag } from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'

/** Deep-Link `/auftraege/[id]/rechnungen-auswahl` → Bottom Card, Schließen zurück zum Auftrag. */
export function RechnungAuswahlPageClient({
  auftragId,
  rechnungen,
  gewerke,
  preislisten,
  firm,
  zahlungszielTage,
}: {
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  auftragsReferenz?: string | null
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm?: FirmenEinstellungen
  zahlungszielTage: number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<RechnungWizardBootstrap | null>(null)
  const [wizardKey, setWizardKey] = useState(0)

  const backToAuftrag = useCallback(() => {
    setSheetOpen(false)
    router.push(`/auftraege/${auftragId}`)
  }, [auftragId, router])

  const openWizard = useCallback((bootstrap: RechnungWizardBootstrap) => {
    setSheetOpen(false)
    setWizardBootstrap(bootstrap)
    setWizardKey((k) => k + 1)
    setWizardOpen(true)
  }, [])

  const closeWizard = useCallback(() => {
    setWizardOpen(false)
    setWizardBootstrap(null)
    router.push(`/auftraege/${auftragId}`)
  }, [auftragId, router])

  const neueRechnung = useCallback(() => {
    startTransition(async () => {
      const res = await loadRechnungWizardBootstrapFromAuftrag(auftragId)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      openWizard(res.bootstrap)
    })
  }, [auftragId, openWizard])

  return (
    <>
      <RechnungAuswahlModal
        open={sheetOpen && !wizardOpen}
        onClose={backToAuftrag}
        auftragId={auftragId}
        rechnungen={rechnungen}
        onNeueRechnung={neueRechnung}
        onWeiterbearbeiten={openWizard}
      />

      {wizardOpen && wizardBootstrap ? (
        <RechnungWizard
          key={wizardKey}
          bootstrap={wizardBootstrap}
          gewerke={gewerke}
          preislisten={preislisten}
          firm={firm}
          zahlungszielTage={zahlungszielTage}
          onClose={closeWizard}
          onDone={() => {
            closeWizard()
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
