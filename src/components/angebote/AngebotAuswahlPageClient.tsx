'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotAuswahlZeile } from '@/components/angebote/AngebotAuswahlPanel'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, KundenObjekt, LeadDetail, Preisliste } from '@/lib/types'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  {
    ssr: false,
    loading: () => <CrmInlineLoading label="Angebot-Assistent wird geladen …" minHeight={120} />,
  }
)

/** Deep-Link Angebot-Auswahl → Bottom Card, Schließen zurück zur Anfrage. */
export function AngebotAuswahlPageClient({
  lead,
  angebote,
  gewerke,
  preislisten,
  firm,
  kundenObjekte = [],
}: {
  lead: LeadDetail
  angebote: AngebotAuswahlZeile[]
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  kundenObjekte?: KundenObjekt[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const [wizardSavedAngebotId, setWizardSavedAngebotId] = useState<string | null>(null)
  const wizardFinishLockRef = useRef(false)

  const backToAnfrage = useCallback(() => {
    setSheetOpen(false)
    router.push(`/anfragen/${lead.id}`)
  }, [lead.id, router])

  const openWizard = useCallback((bootstrap: AngebotWizardBootstrap | null) => {
    wizardFinishLockRef.current = false
    setSheetOpen(false)
    setWizardSavedAngebotId(bootstrap?.angebotId?.trim() || null)
    setWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setWizardOpen(true)
  }, [])

  const finishWizardAndGo = useCallback(
    (angebotId?: string | null) => {
      const id = (angebotId ?? wizardSavedAngebotId)?.trim() || null
      setWizardOpen(false)
      setWizardBootstrap(null)
      setWizardSavedAngebotId(null)
      if (wizardFinishLockRef.current) return
      wizardFinishLockRef.current = true
      if (id) {
        router.push(`/angebote/${id}`)
        return
      }
      router.push(`/anfragen/${lead.id}`)
      router.refresh()
    },
    [wizardSavedAngebotId, router, lead.id]
  )

  return (
    <>
      <AngebotAuswahlModal
        open={sheetOpen && !wizardOpen}
        onClose={backToAnfrage}
        leadId={lead.id}
        angebote={angebote}
        onNeuesAngebot={() => openWizard(null)}
        onWeiterbearbeiten={(bootstrap) => openWizard(bootstrap)}
        onKopie={(bootstrap) => openWizard(bootstrap)}
      />

      {wizardOpen ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={gewerke}
          preislisten={preislisten}
          firm={firm}
          kundenObjekte={kundenObjekte}
          bootstrap={wizardBootstrap}
          onClose={() => finishWizardAndGo(wizardSavedAngebotId)}
          onSaved={(id) => {
            setWizardSavedAngebotId(id)
          }}
          onDone={(id) => {
            finishWizardAndGo(id)
          }}
        />
      ) : null}
    </>
  )
}
