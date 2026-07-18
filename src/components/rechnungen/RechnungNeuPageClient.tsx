'use client'

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
  const zahlungszielTage =
    Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage(bootstrap.kunde?.typ))

  return (
    <RechnungWizard
      bootstrap={bootstrap}
      gewerke={gewerke}
      preislisten={preislisten}
      firm={firm}
      zahlungszielTage={zahlungszielTage}
      onClose={() => router.push('/rechnungen')}
      onDone={(rechnungId) => router.push(`/rechnungen/${rechnungId}`)}
    />
  )
}
