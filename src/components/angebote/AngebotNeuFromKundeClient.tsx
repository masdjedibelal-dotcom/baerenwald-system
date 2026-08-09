'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { leadStubFromKunde } from '@/lib/angebote/lead-stub-from-kunde'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Handwerker, Kunde, Preisliste } from '@/lib/types'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  {
    ssr: false,
    loading: () => <CrmInlineLoading label="Angebot-Assistent wird geladen …" />,
  }
)

/** FAB / Neu: Angebot ohne vorab angelegte Anfrage — Lead entsteht erst beim Speichern. */
export function AngebotNeuFromKundeClient({
  kunde,
  gewerke,
  preislisten,
  firm,
  handwerker = [],
}: {
  kunde: Kunde
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  handwerker?: Handwerker[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const initialLead = useMemo(() => leadStubFromKunde(kunde), [kunde])
  const [sessionKey] = useState(0)

  const leave = useCallback(
    (angebotId?: string) => {
      setOpen(false)
      if (angebotId) {
        router.replace(`/angebote/${angebotId}`)
        return
      }
      router.replace('/vorgaenge?tab=angebot')
    },
    [router]
  )

  if (!open) {
    return <CrmInlineLoading label="Wird geschlossen …" minHeight={120} />
  }

  return (
    <AngebotWizard
      key={sessionKey}
      lead={initialLead}
      gewerke={gewerke}
      preislisten={preislisten}
      firm={firm}
      handwerker={handwerker}
      deferredLeadCreate
      onClose={() => leave()}
      onDone={(id) => leave(id)}
      onSaved={() => {
        /* Lead/Angebot existieren erst nach Speichern — Detail-Navigation in onDone */
      }}
    />
  )
}
