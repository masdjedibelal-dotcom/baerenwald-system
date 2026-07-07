'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import { buildStandaloneRechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-bootstrap-helpers'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { defaultZahlungszielTage } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Preisliste } from '@/lib/types'

export function RechnungNeuPageClient({
  gewerke,
  preislisten,
  firm,
  initialKundeId,
}: {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  initialKundeId?: string | null
}) {
  const router = useRouter()
  const bootstrap = useMemo(
    () => buildStandaloneRechnungWizardBootstrap(firm),
    [firm]
  )
  const zahlungszielTage = defaultZahlungszielTage()

  return (
    <RechnungWizard
      bootstrap={bootstrap}
      gewerke={gewerke}
      preislisten={preislisten}
      firm={firm}
      zahlungszielTage={zahlungszielTage}
      initialKundeId={initialKundeId?.trim() || undefined}
      onClose={() => router.push('/rechnungen')}
      onDone={(rechnungId) => router.push(`/rechnungen/${rechnungId}`)}
    />
  )
}
