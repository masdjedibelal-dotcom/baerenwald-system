'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  defaultZahlungszielTage,
  type RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Preisliste } from '@/lib/types'

export function RechnungNeuPageClient({
  gewerke,
  preislisten,
  firm,
  bootstrap,
}: {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  bootstrap: RechnungWizardBootstrap
}) {
  const router = useRouter()
  /** true nach Speichern/Versand — onClose darf dann nicht mehr history/Liste überschreiben */
  const finishedRef = useRef(false)
  const zahlungszielTage =
    Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage(bootstrap.kunde?.typ))

  function leave(rechnungId?: string) {
    if (rechnungId) {
      router.replace(`/rechnungen/${rechnungId}`)
      return
    }
    if (bootstrap.auftragId) {
      router.replace(`/auftraege/${bootstrap.auftragId}`)
      return
    }
    router.replace('/vorgaenge?tab=rechnung')
  }

  return (
    <RechnungWizard
      bootstrap={bootstrap}
      gewerke={gewerke}
      preislisten={preislisten}
      firm={firm}
      zahlungszielTage={zahlungszielTage}
      onClose={() => {
        if (finishedRef.current) return
        leave()
      }}
      onDone={(rechnungId) => {
        finishedRef.current = true
        leave(rechnungId)
      }}
    />
  )
}
