'use client'

import { Modal } from '@/components/ui/Modal'
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
  auftragsReferenz,
  onNeueRechnung,
  onWeiterbearbeiten,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  auftragsReferenz?: string | null
  onNeueRechnung: () => void
  onWeiterbearbeiten: (bootstrap: RechnungWizardBootstrap) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Rechnungen" size="lg">
      <RechnungAuswahlPanel
        variant="modal"
        auftragId={auftragId}
        rechnungen={rechnungen}
        auftragsReferenz={auftragsReferenz}
        onClose={onClose}
        onNeueRechnung={onNeueRechnung}
        onWeiterbearbeiten={onWeiterbearbeiten}
      />
    </Modal>
  )
}
