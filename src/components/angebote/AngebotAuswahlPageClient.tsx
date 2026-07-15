'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppListScreen } from '@/components/layout/app'
import {
  AngebotAuswahlPanel,
  type AngebotAuswahlZeile,
} from '@/components/angebote/AngebotAuswahlPanel'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, KundenObjekt, LeadDetail, Preisliste } from '@/lib/types'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  { ssr: false }
)

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
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)

  const openWizard = useCallback((bootstrap: AngebotWizardBootstrap | null) => {
    setWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setWizardOpen(true)
  }, [])

  const closeWizard = useCallback(() => {
    setWizardOpen(false)
    setWizardBootstrap(null)
  }, [])

  return (
    <AppListScreen>
      <div className="px-1 pb-6">
        <AngebotAuswahlPanel
          variant="page"
          leadId={lead.id}
          angebote={angebote}
          onNeuesAngebot={() => openWizard(null)}
          onWeiterbearbeiten={(bootstrap) => openWizard(bootstrap)}
          onKopie={(bootstrap) => openWizard(bootstrap)}
        />
      </div>

      {wizardOpen ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={gewerke}
          preislisten={preislisten}
          firm={firm}
          kundenObjekte={kundenObjekte}
          bootstrap={wizardBootstrap}
          onClose={closeWizard}
          onDone={() => {
            closeWizard()
            router.push(`/anfragen/${lead.id}`)
            router.refresh()
          }}
        />
      ) : null}
    </AppListScreen>
  )
}
