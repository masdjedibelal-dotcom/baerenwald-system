'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
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
    <EditorSheet open={open} onClose={onClose} title="Angebote" context="detail" size="md">
      <AngebotAuswahlPanel
        leadId={leadId}
        angebote={angebote}
        onClose={onClose}
        onNeuesAngebot={onNeuesAngebot}
        onWeiterbearbeiten={onWeiterbearbeiten}
        onKopie={onKopie}
      />
    </EditorSheet>
  )
}
