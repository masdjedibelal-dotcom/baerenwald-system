'use client'

import { Modal } from '@/components/ui/Modal'
import {
  AngebotAuswahlPanel,
  type AngebotAuswahlZeile,
} from '@/components/angebote/AngebotAuswahlPanel'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'

export type { AngebotAuswahlZeile }

export function AngebotAuswahlModal({
  open,
  onClose,
  leadId,
  angebote,
  onNeuesAngebot,
  onWeiterbearbeiten,
  onKopie,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  angebote: AngebotAuswahlZeile[]
  onNeuesAngebot: () => void
  onWeiterbearbeiten: (bootstrap: AngebotWizardBootstrap) => void
  onKopie?: (bootstrap: AngebotWizardBootstrap) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Angebote" size="lg">
      <AngebotAuswahlPanel
        variant="modal"
        leadId={leadId}
        angebote={angebote}
        onClose={onClose}
        onNeuesAngebot={onNeuesAngebot}
        onWeiterbearbeiten={onWeiterbearbeiten}
        onKopie={onKopie}
      />
    </Modal>
  )
}
