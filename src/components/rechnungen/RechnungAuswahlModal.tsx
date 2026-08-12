'use client'

import { useState, type ReactNode } from 'react'
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
  const [footer, setFooter] = useState<ReactNode>(null)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rechnungen"
      subtitle="Bestehende wählen oder neu anlegen"
      size="lg"
      footer={footer}
      footerSpread
    >
      <RechnungAuswahlPanel
        variant="modal"
        auftragId={auftragId}
        rechnungen={rechnungen}
        auftragsReferenz={auftragsReferenz}
        onClose={onClose}
        onNeueRechnung={onNeueRechnung}
        onWeiterbearbeiten={onWeiterbearbeiten}
        onFooterChange={setFooter}
      />
    </Modal>
  )
}
