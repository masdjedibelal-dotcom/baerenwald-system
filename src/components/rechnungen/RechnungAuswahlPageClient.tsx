'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AppListScreen } from '@/components/layout/app'
import { RechnungAuswahlPanel, type RechnungAuswahlZeile } from '@/components/rechnungen/RechnungAuswahlPanel'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import { loadRechnungWizardBootstrapFromAuftrag } from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'

export function RechnungAuswahlPageClient({
  auftragId,
  rechnungen,
  auftragsReferenz,
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
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<RechnungWizardBootstrap | null>(null)
  const [wizardKey, setWizardKey] = useState(0)

  const openWizard = useCallback((bootstrap: RechnungWizardBootstrap) => {
    setWizardBootstrap(bootstrap)
    setWizardKey((k) => k + 1)
    setWizardOpen(true)
  }, [])

  const closeWizard = useCallback(() => {
    setWizardOpen(false)
    setWizardBootstrap(null)
  }, [])

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
    <AppListScreen>
      <div className="px-1 pb-6">
        <RechnungAuswahlPanel
          variant="page"
          auftragId={auftragId}
          rechnungen={rechnungen}
          auftragsReferenz={auftragsReferenz}
          onNeueRechnung={neueRechnung}
          onWeiterbearbeiten={openWizard}
        />
      </div>

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
            router.push(`/auftraege/${auftragId}`)
            router.refresh()
          }}
        />
      ) : null}
    </AppListScreen>
  )
}
