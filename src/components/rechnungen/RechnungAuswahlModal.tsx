'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  RechnungAuswahlPanel,
  type RechnungAuswahlZeile,
} from '@/components/rechnungen/RechnungAuswahlPanel'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

export type { RechnungAuswahlZeile }

export function RechnungAuswahlModal({
  open,
  onClose,
  auftragId,
  rechnungen,
  onNeueRechnung,
  onWeiterbearbeiten,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  /** @deprecated ungenutzt — Titel bleibt „Rechnungen“ */
  auftragsReferenz?: string | null
  onNeueRechnung: () => void
  onWeiterbearbeiten: (bootstrap: RechnungWizardBootstrap) => void
}) {
  return (
    <EditorSheet open={open} onClose={onClose} title="Rechnungen" context="detail" size="md">
      <RechnungAuswahlPanel
        auftragId={auftragId}
        rechnungen={rechnungen}
        onClose={onClose}
        onNeueRechnung={onNeueRechnung}
        onWeiterbearbeiten={onWeiterbearbeiten}
      />
    </EditorSheet>
  )
}
